/**
 * MOG2 background subtraction: an adaptive Gaussian mixture model per pixel
 * whose number of components is selected online.
 *
 * Implements Zivkovic & van der Heijden, "Improved adaptive Gaussian mixture
 * model for background subtraction" (ICPR 2004) and "Efficient adaptive
 * density estimation per image pixel for the task of background subtraction"
 * (Pattern Recognition Letters, 2006). Parameter names and mask values follow
 * OpenCV's
 * {@link https://docs.opencv.org/4.x/d7/d7b/classcv_1_1BackgroundSubtractorMOG2.html BackgroundSubtractorMOG2}
 * so an OpenCV user recognises every knob.
 *
 * Frames are flat `Uint8Array`s (same layout as canvas `ImageData.data`); the
 * result is a one byte per pixel mask of {@link MASK_BACKGROUND},
 * {@link MASK_SHADOW} and {@link MASK_FOREGROUND}.
 *
 * @example Static scene, then a pixel that jumps
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { createMog2, MASK_FOREGROUND } from "@hertzg/mog2";
 *
 * const mog2 = createMog2({ width: 2, height: 1, detectShadows: false });
 * const scene = new Uint8Array([50, 50]);
 * mog2.apply(scene);
 * assertEquals(mog2.apply(scene), new Uint8Array([0, 0]));
 * assertEquals(
 *   mog2.apply(new Uint8Array([50, 200])),
 *   new Uint8Array([0, MASK_FOREGROUND]),
 * );
 * ```
 *
 * @module
 */

/**
 * Mask value of a pixel that matches the learned background.
 *
 * @example Reading a mask
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { createMog2, MASK_BACKGROUND } from "@hertzg/mog2";
 *
 * const mog2 = createMog2({ width: 1, height: 1 });
 * mog2.apply(new Uint8Array([50]));
 * assertEquals(mog2.apply(new Uint8Array([50]))[0], MASK_BACKGROUND);
 * ```
 */
export const MASK_BACKGROUND = 0;
/**
 * Mask value of a pixel that is a darker version of the background.
 *
 * @example Reading a mask
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { createMog2, MASK_SHADOW } from "@hertzg/mog2";
 *
 * const mog2 = createMog2({ width: 1, height: 1 });
 * for (let i = 0; i < 10; i++) mog2.apply(new Uint8Array([200]));
 * assertEquals(mog2.apply(new Uint8Array([120]))[0], MASK_SHADOW);
 * ```
 */
export const MASK_SHADOW = 127;
/**
 * Mask value of a pixel that does not match the learned background.
 *
 * @example Reading a mask
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { createMog2, MASK_FOREGROUND } from "@hertzg/mog2";
 *
 * const mog2 = createMog2({ width: 1, height: 1, detectShadows: false });
 * mog2.apply(new Uint8Array([50]));
 * assertEquals(mog2.apply(new Uint8Array([200]))[0], MASK_FOREGROUND);
 * ```
 */
export const MASK_FOREGROUND = 255;

const DEFAULT_CHANNELS = 1;
const DEFAULT_HISTORY = 500;
const DEFAULT_MIXTURES = 5;
const DEFAULT_VAR_THRESHOLD = 16;
const DEFAULT_VAR_THRESHOLD_GEN = 9;
const DEFAULT_BACKGROUND_RATIO = 0.9;
const DEFAULT_VAR_INIT = 15;
const DEFAULT_VAR_MIN = 4;
const DEFAULT_VAR_MAX_FACTOR = 5;
const DEFAULT_COMPLEXITY_REDUCTION_THRESHOLD = 0.05;
const DEFAULT_DETECT_SHADOWS = true;
const DEFAULT_SHADOW_THRESHOLD = 0.5;
const ALPHA_CHANNEL_COUNT = 4;
const OPAQUE_ALPHA = 255;
const MAX_BYTE = 255;

/**
 * Options for {@link createMog2}.
 *
 * @example Overriding a few defaults
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { createMog2, type Mog2Options } from "@hertzg/mog2";
 *
 * const options: Mog2Options = {
 *   width: 4,
 *   height: 2,
 *   channels: 3,
 *   history: 100,
 * };
 * assertEquals(createMog2(options).channels, 3);
 * ```
 */
export interface Mog2Options {
  /** Frame width in pixels. */
  width: number;
  /** Frame height in pixels. */
  height: number;
  /** Bytes per pixel: 1 gray, 3 RGB, 4 RGBA (alpha is ignored). Default 1. */
  channels?: 1 | 3 | 4;
  /**
   * Length of the history. The default learning rate is
   * `1 / min(2 * frameCount, history)`. Default 500.
   */
  history?: number;
  /** Maximum Gaussian components per pixel (OpenCV `nmixtures`). Default 5. */
  mixtures?: number;
  /**
   * Squared Mahalanobis threshold deciding background versus foreground
   * (OpenCV `Tb`). Default 16.
   */
  varThreshold?: number;
  /**
   * Squared Mahalanobis threshold for matching an existing component during
   * the update (OpenCV `Tg`). Default 9.
   */
  varThresholdGen?: number;
  /**
   * Cumulative weight of the heaviest components that count as background
   * (OpenCV `TB`). Default 0.9.
   */
  backgroundRatio?: number;
  /** Variance of a newly created component. Default 15. */
  varInit?: number;
  /** Lower clamp of component variance. Default 4. */
  varMin?: number;
  /** Upper clamp of component variance. Default `5 * varInit` (75). */
  varMax?: number;
  /**
   * Complexity reduction threshold (OpenCV `CT`). Components whose weight
   * falls below `learningRate * CT` are pruned. Default 0.05.
   */
  complexityReductionThreshold?: number;
  /** Mark shadow pixels with {@link MASK_SHADOW}. Default true. */
  detectShadows?: boolean;
  /**
   * A pixel darker than the background by a factor in `[shadowThreshold, 1]`
   * is a shadow (OpenCV `tau`). Default 0.5.
   */
  shadowThreshold?: number;
}

/**
 * Per-call options for {@link Mog2.apply}.
 *
 * @example Freezing the model
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { createMog2, type Mog2ApplyOptions } from "@hertzg/mog2";
 *
 * const mog2 = createMog2({ width: 1, height: 1, detectShadows: false });
 * const frozen: Mog2ApplyOptions = { learningRate: 0 };
 * mog2.apply(new Uint8Array([50]));
 * mog2.apply(new Uint8Array([50]));
 * assertEquals(mog2.apply(new Uint8Array([200]), frozen), new Uint8Array([255]));
 * assertEquals(mog2.apply(new Uint8Array([200]), frozen), new Uint8Array([255]));
 * ```
 */
export interface Mog2ApplyOptions {
  /**
   * `undefined`, negative or `NaN` selects the automatic rate
   * `1 / min(2 * frameCount, history)`. `0` freezes the model: no mode is
   * created or updated. `>= 1` reinitialises the model from this frame. The
   * first frame after creation or reset always uses the automatic rate (0.5)
   * regardless of this option.
   */
  learningRate?: number;
  /**
   * Output mask buffer of length `width * height`. It is returned when given,
   * which avoids one allocation per frame.
   */
  into?: Uint8Array;
}

/**
 * A MOG2 background model created by {@link createMog2}.
 *
 * @example Reading the model state
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { createMog2 } from "@hertzg/mog2";
 *
 * const mog2 = createMog2({ width: 2, height: 2, channels: 4 });
 * assertEquals(mog2.frameCount, 0);
 * mog2.apply(new Uint8Array(16));
 * assertEquals(mog2.frameCount, 1);
 * mog2.reset();
 * assertEquals(mog2.frameCount, 0);
 * ```
 */
export interface Mog2 {
  /** Frame width in pixels. */
  readonly width: number;
  /** Frame height in pixels. */
  readonly height: number;
  /** Bytes per pixel of input frames. */
  readonly channels: 1 | 3 | 4;
  /** Number of frames applied since creation or the last {@link reset}. */
  readonly frameCount: number;
  /**
   * Updates the model with `frame` and returns the foreground mask.
   *
   * @param frame Pixel-interleaved frame of `width * height * channels` bytes.
   * @param options Learning rate and optional output buffer.
   * @returns Mask of `width * height` bytes.
   * @throws {RangeError} when `frame.length` is not `width * height * channels`.
   */
  apply(
    frame: Uint8Array | Uint8ClampedArray,
    options?: Mog2ApplyOptions,
  ): Uint8Array;
  /**
   * Returns the current background estimate in the layout of input frames.
   *
   * @template T Type of the output buffer; defaults to `Uint8Array`.
   * @param into Optional output buffer of `width * height * channels` bytes.
   *   A `Uint8ClampedArray` can be passed to build an `ImageData` without a
   *   copy.
   * @returns `into` when given, else a new `Uint8Array`. Alpha bytes are 255.
   */
  getBackgroundImage<T extends Uint8Array | Uint8ClampedArray = Uint8Array>(
    into?: T,
  ): T;
  /** Drops all learned components and sets `frameCount` to 0. */
  reset(): void;
}

/**
 * Creates a MOG2 background model.
 *
 * The model keeps its whole state in flat typed arrays allocated once. Frame 1
 * has no learned components, so every pixel is foreground (or shadow when
 * `detectShadows` is on); from frame 2 on a static scene is all background.
 * With shadows on, a pixel that is 0 on every modelled channel is reported as
 * foreground (255) instead, because the shadow test bails when the background
 * mean is all zero. OpenCV does the same.
 *
 * @param options Frame geometry and algorithm parameters.
 * @returns A model; call {@link Mog2.apply} once per frame.
 * @throws {RangeError} when `width` or `height` is not a positive integer or
 *   `channels` is not 1, 3 or 4.
 *
 * @example First and second frame of a static scene
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { createMog2 } from "@hertzg/mog2";
 *
 * const mog2 = createMog2({ width: 2, height: 2, detectShadows: false });
 * const scene = new Uint8Array([10, 20, 30, 40]);
 * assertEquals(mog2.apply(scene), new Uint8Array([255, 255, 255, 255]));
 * assertEquals(mog2.apply(scene), new Uint8Array([0, 0, 0, 0]));
 * ```
 *
 * @example Learning rate 1 adopts the frame as background
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { createMog2 } from "@hertzg/mog2";
 *
 * const mog2 = createMog2({ width: 2, height: 1, detectShadows: false });
 * mog2.apply(new Uint8Array([50, 50]));
 * const changed = new Uint8Array([200, 200]);
 * assertEquals(mog2.apply(changed, { learningRate: 1 }), new Uint8Array([255, 255]));
 * assertEquals(mog2.apply(changed), new Uint8Array([0, 0]));
 * ```
 *
 * @example Shadows are darker versions of the background
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { createMog2, MASK_FOREGROUND, MASK_SHADOW } from "@hertzg/mog2";
 *
 * const mog2 = createMog2({ width: 2, height: 1 });
 * const scene = new Uint8Array([200, 200]);
 * for (let i = 0; i < 10; i++) mog2.apply(scene);
 * assertEquals(
 *   mog2.apply(new Uint8Array([120, 40])),
 *   new Uint8Array([MASK_SHADOW, MASK_FOREGROUND]),
 * );
 * ```
 *
 * @example RGBA frames ignore alpha
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { createMog2 } from "@hertzg/mog2";
 *
 * const mog2 = createMog2({ width: 1, height: 1, channels: 4 });
 * mog2.apply(new Uint8Array([10, 20, 30, 255]));
 * assertEquals(mog2.apply(new Uint8Array([10, 20, 30, 0])), new Uint8Array([0]));
 * assertEquals(
 *   mog2.getBackgroundImage(),
 *   new Uint8Array([10, 20, 30, 255]),
 * );
 * ```
 *
 * @example Rejects invalid geometry
 * ```ts
 * import { assertThrows } from "@std/assert";
 * import { createMog2 } from "@hertzg/mog2";
 *
 * assertThrows(() => createMog2({ width: 0, height: 4 }), RangeError);
 * ```
 */
export function createMog2(options: Mog2Options): Mog2 {
  const { width, height } = options;
  const channels = options.channels ?? DEFAULT_CHANNELS;
  if (!Number.isInteger(width) || width <= 0) {
    throw new RangeError(`width must be a positive integer, got ${width}`);
  }
  if (!Number.isInteger(height) || height <= 0) {
    throw new RangeError(`height must be a positive integer, got ${height}`);
  }
  if (channels !== 1 && channels !== 3 && channels !== 4) {
    throw new RangeError(`channels must be 1, 3 or 4, got ${channels}`);
  }

  const history = options.history ?? DEFAULT_HISTORY;
  const mixtures = options.mixtures ?? DEFAULT_MIXTURES;
  const varThreshold = options.varThreshold ?? DEFAULT_VAR_THRESHOLD;
  const varThresholdGen = options.varThresholdGen ??
    DEFAULT_VAR_THRESHOLD_GEN;
  const backgroundRatio = options.backgroundRatio ??
    DEFAULT_BACKGROUND_RATIO;
  const varInit = options.varInit ?? DEFAULT_VAR_INIT;
  const varMin = options.varMin ?? DEFAULT_VAR_MIN;
  const varMax = options.varMax ?? DEFAULT_VAR_MAX_FACTOR * varInit;
  const complexityReductionThreshold = options.complexityReductionThreshold ??
    DEFAULT_COMPLEXITY_REDUCTION_THRESHOLD;
  const detectShadows = options.detectShadows ?? DEFAULT_DETECT_SHADOWS;
  const shadowThreshold = options.shadowThreshold ??
    DEFAULT_SHADOW_THRESHOLD;

  const pixelCount = width * height;
  const frameLength = pixelCount * channels;
  const modelled = channels === ALPHA_CHANNEL_COUNT ? 3 : channels;

  const weights = new Float32Array(pixelCount * mixtures);
  const means = new Float32Array(pixelCount * mixtures * modelled);
  const variances = new Float32Array(pixelCount * mixtures);
  const modesUsed = new Uint8Array(pixelCount);
  const pixel = new Float32Array(modelled);
  const differences = new Float32Array(modelled);

  let frameCount = 0;

  function swapComponents(base: number, a: number, b: number): void {
    const weight = weights[base + a];
    weights[base + a] = weights[base + b];
    weights[base + b] = weight;
    const variance = variances[base + a];
    variances[base + a] = variances[base + b];
    variances[base + b] = variance;
    const meanA = (base + a) * modelled;
    const meanB = (base + b) * modelled;
    for (let c = 0; c < modelled; c++) {
      const mean = means[meanA + c];
      means[meanA + c] = means[meanB + c];
      means[meanB + c] = mean;
    }
  }

  function isShadow(base: number, modeCount: number): boolean {
    let cumulativeWeight = 0;
    for (let mode = 0; mode < modeCount; mode++) {
      const meanBase = (base + mode) * modelled;
      let numerator = 0;
      let denominator = 0;
      for (let c = 0; c < modelled; c++) {
        const mean = means[meanBase + c];
        numerator += pixel[c] * mean;
        denominator += mean * mean;
      }
      if (denominator === 0) return false;
      const ratio = numerator / denominator;
      if (ratio <= 1 && ratio >= shadowThreshold) {
        let distance2 = 0;
        for (let c = 0; c < modelled; c++) {
          const difference = ratio * means[meanBase + c] - pixel[c];
          distance2 += difference * difference;
        }
        if (distance2 < varThreshold * variances[base + mode] * ratio * ratio) {
          return true;
        }
      }
      cumulativeWeight += weights[base + mode];
      if (cumulativeWeight > backgroundRatio) return false;
    }
    return false;
  }

  function apply(
    frame: Uint8Array | Uint8ClampedArray,
    applyOptions?: Mog2ApplyOptions,
  ): Uint8Array {
    if (frame.length !== frameLength) {
      throw new RangeError(
        `frame length must be ${frameLength}, got ${frame.length}`,
      );
    }
    const mask = applyOptions?.into ?? new Uint8Array(pixelCount);
    const learningRate = applyOptions?.learningRate;

    if (learningRate !== undefined && learningRate >= 1) reset();
    frameCount += 1;
    const alphaT = learningRate !== undefined && learningRate >= 0 &&
        frameCount > 1
      ? learningRate
      : 1 / Math.min(2 * frameCount, history);
    const alpha1 = 1 - alphaT;
    const prune = -alphaT * complexityReductionThreshold;

    for (let p = 0; p < pixelCount; p++) {
      const base = p * mixtures;
      const frameOffset = p * channels;
      for (let c = 0; c < modelled; c++) pixel[c] = frame[frameOffset + c];

      let modeCount = modesUsed[p];
      let totalWeight = 0;
      let fitsPdf = false;
      let isBackground = false;

      for (let mode = 0; mode < modeCount; mode++) {
        let weight = alpha1 * weights[base + mode] + prune;
        let swapCount = 0;
        if (!fitsPdf) {
          const variance = variances[base + mode];
          const meanBase = (base + mode) * modelled;
          let distance2 = 0;
          for (let c = 0; c < modelled; c++) {
            const difference = pixel[c] - means[meanBase + c];
            differences[c] = difference;
            distance2 += difference * difference;
          }
          if (
            totalWeight < backgroundRatio &&
            distance2 < varThreshold * variance
          ) {
            isBackground = true;
          }
          if (distance2 < varThresholdGen * variance) {
            fitsPdf = true;
            weight += alphaT;
            const gain = weight > 0 ? alphaT / weight : 0;
            for (let c = 0; c < modelled; c++) {
              means[meanBase + c] += gain * differences[c];
            }
            const updated = variance + gain * (distance2 - variance);
            variances[base + mode] = Math.min(
              Math.max(updated, varMin),
              varMax,
            );
            for (
              let i = mode;
              i > 0 && weight >= weights[base + i - 1];
              i--
            ) {
              swapComponents(base, i, i - 1);
              swapCount++;
            }
          }
        }
        if (weight < -prune) {
          weight = 0;
          modeCount--;
        }
        weights[base + mode - swapCount] = weight;
        totalWeight += weight;
      }

      if (totalWeight !== 0) {
        const scale = 1 / totalWeight;
        for (let mode = 0; mode < modeCount; mode++) {
          weights[base + mode] *= scale;
        }
      }

      if (!fitsPdf && alphaT > 0) {
        const mode = modeCount === mixtures ? mixtures - 1 : modeCount++;
        if (modeCount === 1) {
          weights[base + mode] = 1;
        } else {
          weights[base + mode] = alphaT;
          for (let i = 0; i < mode; i++) weights[base + i] *= alpha1;
        }
        const meanBase = (base + mode) * modelled;
        for (let c = 0; c < modelled; c++) means[meanBase + c] = pixel[c];
        variances[base + mode] = varInit;
        for (
          let i = mode;
          i > 0 && weights[base + i] >= weights[base + i - 1];
          i--
        ) {
          swapComponents(base, i, i - 1);
        }
      }

      modesUsed[p] = modeCount;
      mask[p] = isBackground
        ? MASK_BACKGROUND
        : detectShadows && isShadow(base, modeCount)
        ? MASK_SHADOW
        : MASK_FOREGROUND;
    }
    return mask;
  }

  function getBackgroundImage<
    T extends Uint8Array | Uint8ClampedArray = Uint8Array,
  >(into?: T): T {
    const image = into ?? new Uint8Array(frameLength) as T;
    for (let p = 0; p < pixelCount; p++) {
      const base = p * mixtures;
      const frameOffset = p * channels;
      const modeCount = modesUsed[p];
      for (let c = 0; c < modelled; c++) {
        let sum = 0;
        let channelTotal = 0;
        for (let mode = 0; mode < modeCount; mode++) {
          const weight = weights[base + mode];
          sum += weight * means[(base + mode) * modelled + c];
          channelTotal += weight;
          if (channelTotal > backgroundRatio) break;
        }
        image[frameOffset + c] = channelTotal > 0
          ? Math.min(Math.max(Math.round(sum / channelTotal), 0), MAX_BYTE)
          : 0;
      }
      if (channels === ALPHA_CHANNEL_COUNT) {
        image[frameOffset + modelled] = OPAQUE_ALPHA;
      }
    }
    return image;
  }

  function reset(): void {
    weights.fill(0);
    means.fill(0);
    variances.fill(0);
    modesUsed.fill(0);
    frameCount = 0;
  }

  return {
    width,
    height,
    channels,
    get frameCount() {
      return frameCount;
    },
    apply,
    getBackgroundImage,
    reset,
  };
}
