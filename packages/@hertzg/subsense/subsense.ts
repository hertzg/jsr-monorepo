/**
 * SuBSENSE background subtraction: a per-pixel sample model compared with
 * colour distance and LBSP descriptor distance, with feedback loops that adapt
 * the distance threshold (R), the learning rate (T) and a variation modulator
 * (v) for every pixel.
 *
 * Mask post-processing is simplified compared to the reference implementation:
 * only a majority (median) filter is applied, there is no morphological close,
 * hole fill or erosion.
 *
 * @module @hertzg/subsense/subsense
 */

import { type ChannelCount, convertToGrayscale } from "./grayscale.ts";
import type { GrayImage } from "./grayscale.ts";
import {
  computeHammingDistance16,
  computeLbsp,
  createLbspThresholdTable,
  LBSP_BIT_COUNT,
} from "./lbsp.ts";
import type { LbspReference } from "./lbsp.ts";
import {
  applyMajorityFilter,
  BACKGROUND,
  FOREGROUND,
  orMasks,
  xorMasks,
} from "./mask.ts";

// Positional parameters: the per-pixel helpers below run once per pixel per
// frame, so they may take up to three positional parameters when the third is a
// plain number. Anything beyond that (flags, colours, descriptors, means) is
// passed through the per-pixel scratch in `state.match`, never as arguments.

/** Amount subtracted from T per frame in stable background (unitless factor). */
const FEEDBACK_T_DECR = 0.1;
/** Amount added to T per frame in foreground (unitless factor). */
const FEEDBACK_T_INCR = 0.5;
/** Amount added to v per frame while a pixel blinks (unitless). */
const FEEDBACK_V_INCR = 1;
/** Amount removed from v per frame in calm regions, also its floor (unitless). */
const FEEDBACK_V_DECR = 0.1;
/** Step size of the R feedback loop (unitless). */
const FEEDBACK_R_VAR = 0.01;
/** Smoothed raw/final disagreement and min distance above which a pixel is unstable (ratio, 0..1). */
const UNSTABLE_REGION_RATIO_MIN = 0.1;
/** R above which a pixel is considered unstable (unitless, multiplier of the base thresholds). */
const UNSTABLE_REGION_RDIST_MIN = 3;
/** Neighbour mean last-distance below which a pixel may be a ghost (normalised distance, 0..1). */
const GHOST_DETECTION_D_MAX = 0.01;
/** Neighbour mean raw segmentation above which a pixel may be a ghost (ratio, 0..1). */
const GHOST_DETECTION_S_MIN = 0.995;
/** Window of the long term moving averages (frames). */
const MOVING_AVERAGE_WINDOW_FRAMES = 100;
/** Window divisor for the short term moving averages (long window / this). */
const SHORT_TERM_WINDOW_DIVISOR = 4;
/** Largest possible colour distance between two 8-bit intensities (intensity levels). */
const COLOR_MAX_DISTANCE = 255;
/** Largest possible descriptor distance (bits). */
const DESCRIPTOR_MAX_DISTANCE = LBSP_BIT_COUNT;
/** Divisor of the base colour threshold giving the stable-region reduction (unitless). */
const STABLE_COLOR_DISTANCE_DIVISOR = 5;
/** Neighbourhood radius used when initialising the model and spreading samples in stable regions (pixels). */
const STABLE_NEIGHBOURHOOD_RADIUS_PIXELS = 1;
/** Neighbourhood radius used when initialising the model and spreading samples in unstable regions (pixels). */
const UNSTABLE_NEIGHBOURHOOD_RADIUS_PIXELS = 2;
/** Radius of the dilation that clears blink flags around foreground (pixels, 7x7 window). */
const BLINK_CLEAR_RADIUS_PIXELS = 3;
/** Exclusive upper bound of the random integer used for the spread decision. */
const SPREAD_RANDOM_RANGE = 2 ** 31;
/** Divisor turning a descriptor distance (bits) into a colour-scale penalty in the combined match distance (unitless). */
const DESCRIPTOR_DISTANCE_COLOR_SCALE_DIVISOR = 4;
/** Divisor of the update rate giving the neighbour spread rate in unstable regions (unitless). */
const UNSTABLE_SPREAD_RATE_DIVISOR = 2;
/** Offset added to the spread rate in unstable regions, keeping it at least 1 (unitless). */
const UNSTABLE_SPREAD_RATE_OFFSET = 1;
/** Divisor of the v decrement while the last final mask was foreground, slowing the decay (unitless). */
const FOREGROUND_V_DECR_DIVISOR = 4;
/** Divisor of the v decrement in unstable regions, slowing the decay (unitless). */
const UNSTABLE_V_DECR_DIVISOR = 2;
/** Multiplier of the smaller smoothed min distance in the R growth ceiling (unitless). */
const DISTANCE_THRESHOLD_CEILING_MEAN_SCALE = 2;
/** Exponent of the R growth ceiling (unitless). */
const DISTANCE_THRESHOLD_CEILING_EXPONENT = 2;
/** Initial value of R (unitless multiplier of the base thresholds). */
const INITIAL_DISTANCE_THRESHOLD = 1;
/** Initial value of v (unitless). */
const INITIAL_VARIATION_MODULATOR = 10;
/** Default number of samples kept per pixel. */
const DEFAULT_SAMPLES_PER_PIXEL = 50;
/** Default number of samples that must match (#min). */
const DEFAULT_REQUIRED_MATCHES = 2;
/** Default base colour distance threshold (intensity levels). */
const DEFAULT_COLOR_DISTANCE_THRESHOLD = 30;
/** Default base descriptor distance offset (bits). */
const DEFAULT_DESCRIPTOR_DISTANCE_OFFSET = 3;
/** Default LBSP relative threshold (ratio of the centre intensity). */
const DEFAULT_LBSP_RELATIVE_THRESHOLD = 0.333;
/** Default lower cap of T (frames between updates, fastest). */
const DEFAULT_LEARNING_RATE_LOWER_CAP = 2;
/** Default upper cap of T (frames between updates, slowest). */
const DEFAULT_LEARNING_RATE_UPPER_CAP = 256;
/** Default majority filter kernel size (pixels). */
const DEFAULT_MEDIAN_KERNEL_SIZE_PIXELS = 9;

/** Options for {@linkcode createSubsense}. */
export interface SubsenseOptions {
  /** Frame width in pixels. */
  width: number;
  /** Frame height in pixels. */
  height: number;
  /** Channels per input pixel. Defaults to 1. */
  channels?: ChannelCount;
  /** N: background samples kept per pixel. Defaults to 50. */
  samplesPerPixel?: number;
  /** #min: samples that must match for a pixel to be background. Defaults to 2. */
  requiredMatches?: number;
  /** Base colour distance threshold. Defaults to 30. */
  colorDistanceThreshold?: number;
  /** Base descriptor hamming distance offset. Defaults to 3. */
  descriptorDistanceOffset?: number;
  /** LBSP relative threshold T_r. Defaults to 0.333. */
  lbspRelativeThreshold?: number;
  /** T lower cap (fastest update: 1 in 2 frames). Must be at least 1, it is used as a modulus. Defaults to 2. */
  learningRateLowerCap?: number;
  /** T upper cap (slowest update: 1 in 256 frames). Defaults to 256. */
  learningRateUpperCap?: number;
  /** Median/majority post-filter kernel, odd, 1 disables. Defaults to 9. */
  medianKernelSize?: number;
  /** Source of uniform [0,1) numbers. Defaults to `Math.random`. Inject a seeded one for determinism. */
  random?: () => number;
}

/** A SuBSENSE background subtractor created by {@linkcode createSubsense}. */
export interface Subsense {
  /** Frame width in pixels. */
  readonly width: number;
  /** Frame height in pixels. */
  readonly height: number;
  /** Frames segmented so far. */
  readonly frameCount: number;
  /**
   * Segments one frame (`width * height * channels` bytes). The first frame
   * initialises the model and is then segmented normally.
   *
   * @param frame The frame bytes, row-major, interleaved channels.
   * @returns A new mask, 0 for background and 255 for foreground, of length `width * height`.
   */
  segment(frame: Uint8Array | Uint8ClampedArray): Uint8Array;
  /** Per-pixel distance threshold multiplier R (initially 1), live view for diagnostics. */
  readonly distanceThresholds: Float32Array;
  /** Per-pixel learning rate T (initially the lower cap), live view for diagnostics. */
  readonly learningRates: Float32Array;
  /** Per-pixel variation modulator v (initially 10), live view for diagnostics. */
  readonly variationModulators: Float32Array;
}

/**
 * Per-pixel scratch reused for every pixel: the match result plus the values
 * the helpers read instead of taking them as extra parameters.
 */
interface MatchResult {
  goodMatchCount: number;
  minDescriptorDistance: number;
  minSumDistance: number;
  /** Intensity of the pixel being processed. */
  color: number;
  intraDescriptor: number;
  /** Whether the pixel was classified as raw foreground. */
  isForeground: boolean;
  /** Smaller of the long and short term mean min distance (ratio, 0..1). */
  minMean: number;
  /** Larger of the long and short term mean min distance (ratio, 0..1). */
  maxMean: number;
}

interface SubsenseState {
  readonly width: number;
  readonly height: number;
  readonly pixelCount: number;
  readonly channels: ChannelCount;
  readonly sampleCount: number;
  readonly requiredMatches: number;
  readonly colorDistanceThreshold: number;
  readonly descriptorDistanceOffset: number;
  readonly learningRateLowerCap: number;
  readonly learningRateUpperCap: number;
  readonly medianKernelSize: number;
  readonly stableColorDistanceOffset: number;
  readonly random: () => number;
  readonly thresholdTable: Uint8Array;
  frameCount: number;
  rollLongTerm: number;
  rollShortTerm: number;

  readonly gray: Uint8Array;
  readonly grayImage: GrayImage;
  /**
   * One mutable reference reused for every computeLbsp call in the hot loop:
   * it runs per pixel per sample, and allocating an object each time would
   * dominate the cost.
   */
  readonly reference: LbspReference;
  readonly match: MatchResult;

  readonly distanceThresholds: Float32Array;
  readonly learningRates: Float32Array;
  readonly variationModulators: Float32Array;
  readonly meanLastDistance: Float32Array;
  readonly meanMinDistanceLongTerm: Float32Array;
  readonly meanMinDistanceShortTerm: Float32Array;
  readonly meanRawSegmentationLongTerm: Float32Array;
  readonly meanRawSegmentationShortTerm: Float32Array;
  readonly meanFinalSegmentationLongTerm: Float32Array;
  readonly meanFinalSegmentationShortTerm: Float32Array;
  readonly unstableRegion: Uint8Array;
  readonly lastColor: Uint8Array;
  readonly lastDescriptor: Uint16Array;

  readonly backgroundColor: Uint8Array;
  readonly backgroundDescriptor: Uint16Array;

  readonly rawMask: Uint8Array;
  readonly lastRawMask: Uint8Array;
  readonly finalMask: Uint8Array;
  readonly lastFinalMask: Uint8Array;
  readonly blinkNow: Uint8Array;
  readonly lastBlinkNow: Uint8Array;
  readonly blinks: Uint8Array;
}

function pickRandomInt(state: SubsenseState, exclusiveMax: number): number {
  return Math.floor(state.random() * exclusiveMax);
}

function clampToRange(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function blendToward(mean: number, value: number, weight: number): number {
  return mean * (1 - weight) + value * weight;
}

/** Picks a random pixel index within `radiusPixels` of (x, y), clamped to the image. */
function pickRandomNeighbourIndex(
  state: SubsenseState,
  pixelIndex: number,
  radiusPixels: number,
): number {
  const { width, height } = state;
  const x = pixelIndex % width;
  const y = (pixelIndex - x) / width;
  const span = radiusPixels * 2 + 1;
  const neighbourX = clampToRange(
    x + pickRandomInt(state, span) - radiusPixels,
    0,
    width - 1,
  );
  const neighbourY = clampToRange(
    y + pickRandomInt(state, span) - radiusPixels,
    0,
    height - 1,
  );
  return neighbourY * width + neighbourX;
}

/**
 * Picks a random pixel index within `radiusPixels` of the pixel, never the
 * pixel itself (a 3x3 window has 8 candidates, 5x5 has 24), clamped to the image.
 */
function pickRandomOtherNeighbourIndex(
  state: SubsenseState,
  pixelIndex: number,
  radiusPixels: number,
): number {
  const { width, height } = state;
  const x = pixelIndex % width;
  const y = (pixelIndex - x) / width;
  const span = radiusPixels * 2 + 1;
  const centreSlot = radiusPixels * span + radiusPixels;
  const drawn = pickRandomInt(state, span * span - 1);
  const slot = drawn >= centreSlot ? drawn + 1 : drawn;
  const neighbourX = clampToRange(
    x + (slot % span) - radiusPixels,
    0,
    width - 1,
  );
  const neighbourY = clampToRange(
    y + Math.floor(slot / span) - radiusPixels,
    0,
    height - 1,
  );
  return neighbourY * width + neighbourX;
}

/** Stores the current pixel's colour and descriptor (from `state.match`) into a random sample slot of `pixelIndex`. */
function storeRandomSample(state: SubsenseState, pixelIndex: number): void {
  const slot = pickRandomInt(state, state.sampleCount) * state.pixelCount +
    pixelIndex;
  state.backgroundColor[slot] = state.match.color;
  state.backgroundDescriptor[slot] = state.match.intraDescriptor;
}

/** Fills every pixel's samples from random 5x5 neighbours of the first frame. */
function initializeModel(state: SubsenseState): void {
  const { gray, pixelCount, sampleCount, reference, thresholdTable } = state;
  for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex++) {
    for (let sample = 0; sample < sampleCount; sample++) {
      const neighbourIndex = pickRandomNeighbourIndex(
        state,
        pixelIndex,
        UNSTABLE_NEIGHBOURHOOD_RADIUS_PIXELS,
      );
      const intensity = gray[neighbourIndex];
      reference.intensity = intensity;
      reference.threshold = thresholdTable[intensity];
      const slot = sample * pixelCount + pixelIndex;
      state.backgroundColor[slot] = intensity;
      state.backgroundDescriptor[slot] = computeLbsp(
        state.grayImage,
        neighbourIndex,
        reference,
      );
    }
    state.lastColor[pixelIndex] = gray[pixelIndex];
    reference.intensity = gray[pixelIndex];
    reference.threshold = thresholdTable[gray[pixelIndex]];
    state.lastDescriptor[pixelIndex] = computeLbsp(
      state.grayImage,
      pixelIndex,
      reference,
    );
  }
}

function isUnstableRegion(state: SubsenseState, pixelIndex: number): boolean {
  return state.distanceThresholds[pixelIndex] > UNSTABLE_REGION_RDIST_MIN ||
    state.meanRawSegmentationLongTerm[pixelIndex] -
          state.meanFinalSegmentationLongTerm[pixelIndex] >
      UNSTABLE_REGION_RATIO_MIN ||
    state.meanRawSegmentationShortTerm[pixelIndex] -
          state.meanFinalSegmentationShortTerm[pixelIndex] >
      UNSTABLE_REGION_RATIO_MIN;
}

/**
 * Counts the samples of the pixel that match its current intensity and
 * descriptor, writing the count and the smallest distances into `state.match`.
 */
function classifyPixel(state: SubsenseState, pixelIndex: number): void {
  const { gray, reference, thresholdTable, match, pixelCount } = state;
  const wasUnstable = state.unstableRegion[pixelIndex] === 1;
  const distanceThreshold = state.distanceThresholds[pixelIndex];
  const color = gray[pixelIndex];
  match.color = color;
  const colorThreshold = Math.floor(
    (distanceThreshold * state.colorDistanceThreshold -
      (wasUnstable ? 0 : state.stableColorDistanceOffset)) / 2,
  );
  const descriptorThreshold = (1 << Math.floor(distanceThreshold + 0.5)) +
    state.descriptorDistanceOffset +
    (wasUnstable ? state.descriptorDistanceOffset : 0);

  reference.intensity = color;
  reference.threshold = thresholdTable[color];
  const intraDescriptor = computeLbsp(state.grayImage, pixelIndex, reference);
  state.unstableRegion[pixelIndex] = isUnstableRegion(state, pixelIndex)
    ? 1
    : 0;

  let minDescriptorDistance = DESCRIPTOR_MAX_DISTANCE;
  let minSumDistance = COLOR_MAX_DISTANCE;
  let goodMatchCount = 0;
  for (
    let sample = 0;
    sample < state.sampleCount && goodMatchCount < state.requiredMatches;
    sample++
  ) {
    const slot = sample * pixelCount + pixelIndex;
    const sampleColor = state.backgroundColor[slot];
    const colorDistance = Math.abs(color - sampleColor);
    if (colorDistance > colorThreshold) continue;

    const sampleDescriptor = state.backgroundDescriptor[slot];
    const intraDistance = computeHammingDistance16(
      intraDescriptor,
      sampleDescriptor,
    );
    reference.intensity = sampleColor;
    reference.threshold = thresholdTable[sampleColor];
    const interDistance = computeHammingDistance16(
      computeLbsp(state.grayImage, pixelIndex, reference),
      sampleDescriptor,
    );
    const descriptorDistance = Math.floor((intraDistance + interDistance) / 2);
    if (descriptorDistance > descriptorThreshold) continue;

    const sumDistance = Math.min(
      Math.floor(descriptorDistance / DESCRIPTOR_DISTANCE_COLOR_SCALE_DIVISOR) *
          Math.floor(COLOR_MAX_DISTANCE / DESCRIPTOR_MAX_DISTANCE) +
        colorDistance,
      COLOR_MAX_DISTANCE,
    );
    if (sumDistance > colorThreshold) continue;

    minDescriptorDistance = Math.min(minDescriptorDistance, descriptorDistance);
    minSumDistance = Math.min(minSumDistance, sumDistance);
    goodMatchCount++;
  }
  match.goodMatchCount = goodMatchCount;
  match.minDescriptorDistance = minDescriptorDistance;
  match.minSumDistance = minSumDistance;
  match.intraDescriptor = intraDescriptor;
}

/** Updates the smoothed distance and segmentation statistics of a pixel. */
function updateStatistics(state: SubsenseState, pixelIndex: number): void {
  const { match, rollLongTerm, rollShortTerm, requiredMatches } = state;
  const { color, isForeground } = match;
  const normalizedLastDistance =
    (Math.abs(state.lastColor[pixelIndex] - color) / COLOR_MAX_DISTANCE +
      computeHammingDistance16(
          state.lastDescriptor[pixelIndex],
          match.intraDescriptor,
        ) /
        DESCRIPTOR_MAX_DISTANCE) / 2;
  state.meanLastDistance[pixelIndex] = blendToward(
    state.meanLastDistance[pixelIndex],
    normalizedLastDistance,
    rollShortTerm,
  );

  let normalizedMinDistance = (match.minSumDistance / COLOR_MAX_DISTANCE +
    match.minDescriptorDistance / DESCRIPTOR_MAX_DISTANCE) / 2;
  if (isForeground) {
    normalizedMinDistance = Math.min(
      1,
      normalizedMinDistance +
        (requiredMatches - match.goodMatchCount) / requiredMatches,
    );
  }
  const rawValue = isForeground ? 1 : 0;
  state.meanMinDistanceLongTerm[pixelIndex] = blendToward(
    state.meanMinDistanceLongTerm[pixelIndex],
    normalizedMinDistance,
    rollLongTerm,
  );
  state.meanMinDistanceShortTerm[pixelIndex] = blendToward(
    state.meanMinDistanceShortTerm[pixelIndex],
    normalizedMinDistance,
    rollShortTerm,
  );
  state.meanRawSegmentationLongTerm[pixelIndex] = blendToward(
    state.meanRawSegmentationLongTerm[pixelIndex],
    rawValue,
    rollLongTerm,
  );
  state.meanRawSegmentationShortTerm[pixelIndex] = blendToward(
    state.meanRawSegmentationShortTerm[pixelIndex],
    rawValue,
    rollShortTerm,
  );
}

/** Randomly writes the pixel into its own samples and into a neighbour's. */
function updateModel(state: SubsenseState, pixelIndex: number): void {
  const isUnstable = state.unstableRegion[pixelIndex] === 1;
  const updateRate = Math.ceil(state.learningRates[pixelIndex]);
  if (pickRandomInt(state, updateRate) === 0) {
    storeRandomSample(state, pixelIndex);
  }

  const neighbourIndex = pickRandomOtherNeighbourIndex(
    state,
    pixelIndex,
    isUnstable
      ? UNSTABLE_NEIGHBOURHOOD_RADIUS_PIXELS
      : STABLE_NEIGHBOURHOOD_RADIUS_PIXELS,
  );
  const randomValue = pickRandomInt(state, SPREAD_RANDOM_RANGE);
  const spreadRate = isUnstable
    ? Math.floor(updateRate / UNSTABLE_SPREAD_RATE_DIVISOR) +
      UNSTABLE_SPREAD_RATE_OFFSET
    : updateRate;
  const isGhost = state.meanRawSegmentationShortTerm[neighbourIndex] >
      GHOST_DETECTION_S_MIN &&
    state.meanLastDistance[neighbourIndex] < GHOST_DETECTION_D_MAX &&
    randomValue % Math.floor(state.learningRateLowerCap) === 0;
  if (randomValue % spreadRate === 0 || isGhost) {
    storeRandomSample(state, neighbourIndex);
  }
}

function updateLearningRate(state: SubsenseState, pixelIndex: number): void {
  const { isForeground, minMean, maxMean } = state.match;
  const { learningRateLowerCap, learningRateUpperCap } = state;
  const learningRate = state.learningRates[pixelIndex];
  const variation = state.variationModulators[pixelIndex];
  const isForegroundLike = state.lastFinalMask[pixelIndex] === FOREGROUND ||
    (minMean < UNSTABLE_REGION_RATIO_MIN && isForeground);
  let next = learningRate;
  if (isForegroundLike) {
    if (learningRate < learningRateUpperCap) {
      // maxMean of 0 would divide by zero; the increment is then unbounded.
      next = maxMean === 0
        ? learningRateUpperCap
        : learningRate + FEEDBACK_T_INCR / (maxMean * variation);
    }
  } else if (learningRate > learningRateLowerCap) {
    // maxMean of 0 would divide by zero; the decrement is then unbounded.
    next = maxMean === 0
      ? learningRateLowerCap
      : learningRate - FEEDBACK_T_DECR * variation / maxMean;
  }
  state.learningRates[pixelIndex] = clampToRange(
    next,
    learningRateLowerCap,
    learningRateUpperCap,
  );
}

function updateVariationModulator(
  state: SubsenseState,
  pixelIndex: number,
): void {
  const { maxMean } = state.match;
  const variation = state.variationModulators[pixelIndex];
  if (maxMean > UNSTABLE_REGION_RATIO_MIN && state.blinks[pixelIndex] !== 0) {
    state.variationModulators[pixelIndex] = variation + FEEDBACK_V_INCR;
  } else if (variation > FEEDBACK_V_DECR) {
    const decrement = state.lastFinalMask[pixelIndex] === FOREGROUND
      ? FEEDBACK_V_DECR / FOREGROUND_V_DECR_DIVISOR
      : state.unstableRegion[pixelIndex] === 1
      ? FEEDBACK_V_DECR / UNSTABLE_V_DECR_DIVISOR
      : FEEDBACK_V_DECR;
    state.variationModulators[pixelIndex] = Math.max(
      variation - decrement,
      FEEDBACK_V_DECR,
    );
  }
}

/** Largest R the growth branch of the R feedback loop may reach for a given `minMean`. */
function computeDistanceThresholdCeiling(minMean: number): number {
  return (1 + minMean * DISTANCE_THRESHOLD_CEILING_MEAN_SCALE) **
    DISTANCE_THRESHOLD_CEILING_EXPONENT;
}

function updateDistanceThreshold(
  state: SubsenseState,
  pixelIndex: number,
): void {
  const threshold = state.distanceThresholds[pixelIndex];
  const variation = state.variationModulators[pixelIndex];
  state.distanceThresholds[pixelIndex] =
    threshold < computeDistanceThresholdCeiling(state.match.minMean)
      ? threshold + FEEDBACK_R_VAR * (variation - FEEDBACK_V_DECR)
      : Math.max(
        INITIAL_DISTANCE_THRESHOLD,
        threshold - FEEDBACK_R_VAR / variation,
      );
}

/** Runs the T, v and R feedback loops of one pixel. */
function applyFeedback(state: SubsenseState, pixelIndex: number): void {
  const longTerm = state.meanMinDistanceLongTerm[pixelIndex];
  const shortTerm = state.meanMinDistanceShortTerm[pixelIndex];
  state.match.minMean = Math.min(longTerm, shortTerm);
  state.match.maxMean = Math.max(longTerm, shortTerm);
  updateLearningRate(state, pixelIndex);
  updateVariationModulator(state, pixelIndex);
  updateDistanceThreshold(state, pixelIndex);
  state.lastColor[pixelIndex] = state.gray[pixelIndex];
  state.lastDescriptor[pixelIndex] = state.match.intraDescriptor;
}

function processPixel(state: SubsenseState, pixelIndex: number): void {
  classifyPixel(state, pixelIndex);
  const isForeground = state.match.goodMatchCount < state.requiredMatches;
  state.match.isForeground = isForeground;
  updateStatistics(state, pixelIndex);
  state.rawMask[pixelIndex] = isForeground ? FOREGROUND : BACKGROUND;
  if (!isForeground) updateModel(state, pixelIndex);
  applyFeedback(state, pixelIndex);
}

/** Clears blink flags in a 7x7 window around every foreground pixel. */
function clearBlinksAroundForeground(state: SubsenseState): void {
  const { width, height, finalMask, blinks } = state;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (finalMask[y * width + x] !== FOREGROUND) continue;
      const yEnd = Math.min(height - 1, y + BLINK_CLEAR_RADIUS_PIXELS);
      const xEnd = Math.min(width - 1, x + BLINK_CLEAR_RADIUS_PIXELS);
      for (
        let windowY = Math.max(0, y - BLINK_CLEAR_RADIUS_PIXELS);
        windowY <= yEnd;
        windowY++
      ) {
        for (
          let windowX = Math.max(0, x - BLINK_CLEAR_RADIUS_PIXELS);
          windowX <= xEnd;
          windowX++
        ) {
          blinks[windowY * width + windowX] = 0;
        }
      }
    }
  }
}

/** Derives blink flags and the final mask from the raw mask, then updates final-mask statistics. */
function postProcessMask(state: SubsenseState): void {
  const { rawMask, finalMask, rollLongTerm, rollShortTerm } = state;
  xorMasks(rawMask, state.lastRawMask, state.blinkNow);
  orMasks(state.blinkNow, state.lastBlinkNow, state.blinks);
  state.lastBlinkNow.set(state.blinkNow);
  state.lastRawMask.set(rawMask);

  applyMajorityFilter(
    { data: rawMask, width: state.width, height: state.height },
    { kernelSize: state.medianKernelSize, into: finalMask },
  );
  clearBlinksAroundForeground(state);
  state.lastFinalMask.set(finalMask);

  for (let pixelIndex = 0; pixelIndex < state.pixelCount; pixelIndex++) {
    const finalValue = finalMask[pixelIndex] === FOREGROUND ? 1 : 0;
    state.meanFinalSegmentationLongTerm[pixelIndex] = blendToward(
      state.meanFinalSegmentationLongTerm[pixelIndex],
      finalValue,
      rollLongTerm,
    );
    state.meanFinalSegmentationShortTerm[pixelIndex] = blendToward(
      state.meanFinalSegmentationShortTerm[pixelIndex],
      finalValue,
      rollShortTerm,
    );
  }
}

function segmentFrame(
  state: SubsenseState,
  frame: Uint8Array | Uint8ClampedArray,
): Uint8Array {
  convertToGrayscale(frame, { channels: state.channels, into: state.gray });
  if (state.frameCount === 0) initializeModel(state);
  state.frameCount++;
  state.rollLongTerm = 1 /
    Math.min(state.frameCount, MOVING_AVERAGE_WINDOW_FRAMES);
  state.rollShortTerm = 1 / Math.min(
    state.frameCount,
    MOVING_AVERAGE_WINDOW_FRAMES / SHORT_TERM_WINDOW_DIVISOR,
  );
  for (let pixelIndex = 0; pixelIndex < state.pixelCount; pixelIndex++) {
    processPixel(state, pixelIndex);
  }
  postProcessMask(state);
  return state.finalMask.slice();
}

function createState(options: SubsenseOptions): SubsenseState {
  const { width, height } = options;
  const pixelCount = width * height;
  const sampleCount = options.samplesPerPixel ?? DEFAULT_SAMPLES_PER_PIXEL;
  const colorDistanceThreshold = options.colorDistanceThreshold ??
    DEFAULT_COLOR_DISTANCE_THRESHOLD;
  const learningRateLowerCap = options.learningRateLowerCap ??
    DEFAULT_LEARNING_RATE_LOWER_CAP;
  const gray = new Uint8Array(pixelCount);
  const createFloats = () => new Float32Array(pixelCount);
  return {
    width,
    height,
    pixelCount,
    channels: options.channels ?? 1,
    sampleCount,
    requiredMatches: options.requiredMatches ?? DEFAULT_REQUIRED_MATCHES,
    colorDistanceThreshold,
    descriptorDistanceOffset: options.descriptorDistanceOffset ??
      DEFAULT_DESCRIPTOR_DISTANCE_OFFSET,
    learningRateLowerCap,
    learningRateUpperCap: options.learningRateUpperCap ??
      DEFAULT_LEARNING_RATE_UPPER_CAP,
    medianKernelSize: options.medianKernelSize ??
      DEFAULT_MEDIAN_KERNEL_SIZE_PIXELS,
    stableColorDistanceOffset: colorDistanceThreshold /
      STABLE_COLOR_DISTANCE_DIVISOR,
    random: options.random ?? Math.random,
    thresholdTable: createLbspThresholdTable({
      relativeThreshold: options.lbspRelativeThreshold ??
        DEFAULT_LBSP_RELATIVE_THRESHOLD,
    }),
    frameCount: 0,
    rollLongTerm: 1,
    rollShortTerm: 1,
    gray,
    grayImage: { data: gray, width, height },
    reference: { intensity: 0, threshold: 0 },
    match: {
      goodMatchCount: 0,
      minDescriptorDistance: DESCRIPTOR_MAX_DISTANCE,
      minSumDistance: COLOR_MAX_DISTANCE,
      color: 0,
      intraDescriptor: 0,
      isForeground: false,
      minMean: 0,
      maxMean: 0,
    },
    distanceThresholds: createFloats().fill(INITIAL_DISTANCE_THRESHOLD),
    learningRates: createFloats().fill(learningRateLowerCap),
    variationModulators: createFloats().fill(INITIAL_VARIATION_MODULATOR),
    meanLastDistance: createFloats(),
    meanMinDistanceLongTerm: createFloats(),
    meanMinDistanceShortTerm: createFloats(),
    meanRawSegmentationLongTerm: createFloats(),
    meanRawSegmentationShortTerm: createFloats(),
    meanFinalSegmentationLongTerm: createFloats(),
    meanFinalSegmentationShortTerm: createFloats(),
    unstableRegion: new Uint8Array(pixelCount),
    lastColor: new Uint8Array(pixelCount),
    lastDescriptor: new Uint16Array(pixelCount),
    backgroundColor: new Uint8Array(sampleCount * pixelCount),
    backgroundDescriptor: new Uint16Array(sampleCount * pixelCount),
    rawMask: new Uint8Array(pixelCount),
    lastRawMask: new Uint8Array(pixelCount),
    finalMask: new Uint8Array(pixelCount),
    lastFinalMask: new Uint8Array(pixelCount),
    blinkNow: new Uint8Array(pixelCount),
    lastBlinkNow: new Uint8Array(pixelCount),
    blinks: new Uint8Array(pixelCount),
  };
}

/**
 * Creates a SuBSENSE background subtractor.
 *
 * The frame buffer passed to `segment` must hold `width * height * channels`
 * bytes; this is not checked.
 *
 * @param options Frame geometry and algorithm tuning, see {@linkcode SubsenseOptions}.
 * @returns A stateful {@linkcode Subsense} detector.
 *
 * @example Detecting a bright block on a flat background
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { createSubsense } from "@hertzg/subsense";
 *
 * let seed = 1;
 * const random = () => {
 *   seed ^= seed << 13;
 *   seed ^= seed >>> 17;
 *   seed ^= seed << 5;
 *   return (seed >>> 0) / 2 ** 32;
 * };
 * const detector = createSubsense({
 *   width: 8,
 *   height: 8,
 *   medianKernelSize: 1,
 *   random,
 * });
 * const background = new Uint8Array(64).fill(40);
 * for (let i = 0; i < 5; i++) detector.segment(background);
 *
 * const withBlock = background.slice();
 * withBlock[3 * 8 + 3] = 200;
 * const mask = detector.segment(withBlock);
 * assertEquals(mask[3 * 8 + 3], 255);
 * assertEquals(mask[0], 0);
 * ```
 */
export function createSubsense(options: SubsenseOptions): Subsense {
  const state = createState(options);
  return {
    width: state.width,
    height: state.height,
    get frameCount() {
      return state.frameCount;
    },
    segment: (frame) => segmentFrame(state, frame),
    distanceThresholds: state.distanceThresholds,
    learningRates: state.learningRates,
    variationModulators: state.variationModulators,
  };
}
