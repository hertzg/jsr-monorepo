/**
 * MPEG audio frame header (MP3) encoding and decoding.
 *
 * Every MP3 frame opens with a 4-byte, bit-packed header. All fields are
 * MSB-first within the 32 bits:
 *
 * ```text
 *  0                   1                   2                   3
 *  0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * |          Frame Sync (11)         |Ver|Lyr|P|  Bitrate  |SRat|
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * |Pd|Pr| ChMode|ModeExt|Cp|Or| Emph|
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * ```
 *
 * - **Frame Sync** (11 bits) — always all-ones ({@linkcode MP3_FRAME_SYNC}),
 *   marking the start of a frame.
 * - **Ver** (`mpegVersion`, 2 bits) — MPEG version. See {@linkcode MP3_MPEG_VERSION}.
 * - **Lyr** (`layer`, 2 bits) — MPEG layer. See {@linkcode MP3_LAYER}.
 * - **P** (`protectionAbsent`, 1 bit) — `1` means no CRC follows the header,
 *   `0` means a 16-bit CRC follows (not covered by this coder).
 * - **Bitrate** (`bitrateIndex`, 4 bits) — index into a version/layer-specific
 *   bitrate table. This package does not resolve it to a kbps value.
 * - **SRat** (`samplingRateIndex`, 2 bits) — index into a version-specific
 *   sample-rate table. This package does not resolve it to a Hz value.
 * - **Pd** (`padding`, 1 bit) — `1` if the frame carries one extra padding
 *   slot, used to make the average bitrate match exactly.
 * - **Pr** (`privateBit`, 1 bit) — format-defined, not used by the decoder.
 * - **ChMode** (`channelMode`, 2 bits) — channel mode. See {@linkcode MP3_CHANNEL_MODE}.
 * - **ModeExt** (`modeExtension`, 2 bits) — only meaningful when `channelMode`
 *   is joint stereo; selects which joint-stereo technique applies.
 * - **Cp** (`copyright`, 1 bit) — `1` if the material is copyrighted.
 * - **Or** (`original`, 1 bit) — `1` if this is the original media.
 * - **Emph** (`emphasis`, 2 bits) — de-emphasis to apply on playback.
 *
 * This package covers the 4-byte frame header only. It does not compute
 * frame length, resolve bitrate/sample-rate table indices to real values, or
 * parse ID3 tags, side information, or audio data — see the package
 * description for the full v0.0.1 scope.
 *
 * @example Round-trip a frame header
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import {
 *   MP3_CHANNEL_MODE,
 *   MP3_FRAME_HEADER_SIZE,
 *   MP3_FRAME_SYNC,
 *   MP3_LAYER,
 *   MP3_MPEG_VERSION,
 *   mp3FrameHeader,
 * } from "@binstruct/mp3";
 *
 * const coder = mp3FrameHeader();
 * const header = {
 *   frameSync: MP3_FRAME_SYNC,
 *   mpegVersion: MP3_MPEG_VERSION.MPEG_1,
 *   layer: MP3_LAYER.LAYER_3,
 *   protectionAbsent: 1,
 *   bitrateIndex: 9,
 *   samplingRateIndex: 0,
 *   padding: 0,
 *   privateBit: 0,
 *   channelMode: MP3_CHANNEL_MODE.STEREO,
 *   modeExtension: 0,
 *   copyright: 0,
 *   original: 0,
 *   emphasis: 0,
 * };
 *
 * const buffer = new Uint8Array(MP3_FRAME_HEADER_SIZE);
 * const written = coder.encode(header, buffer);
 * const [decoded, read] = coder.decode(buffer);
 *
 * assertEquals(written, MP3_FRAME_HEADER_SIZE);
 * assertEquals(read, MP3_FRAME_HEADER_SIZE);
 * assertEquals(decoded, header);
 * ```
 *
 * @module
 */

import { bitStruct, type Coder } from "@hertzg/binstruct";

/**
 * Size in bytes of an MP3 frame header (32 bits).
 */
export const MP3_FRAME_HEADER_SIZE = 4;

/**
 * The 11-bit frame sync marker (`0x7ff`, all ones) that opens every MP3
 * frame header.
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { MP3_FRAME_SYNC } from "@binstruct/mp3";
 *
 * assertEquals(MP3_FRAME_SYNC, 0x7ff);
 * ```
 */
export const MP3_FRAME_SYNC = 0x7ff;

/**
 * Values used by the `mpegVersion` field.
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { MP3_MPEG_VERSION } from "@binstruct/mp3";
 *
 * assertEquals(MP3_MPEG_VERSION.MPEG_1, 0b11);
 * assertEquals(MP3_MPEG_VERSION.MPEG_2, 0b10);
 * ```
 */
export const MP3_MPEG_VERSION = {
  /** MPEG Version 2.5 (unofficial extension for very low bitrates). */
  MPEG_2_5: 0b00,
  /** Reserved — not a valid MPEG version. */
  RESERVED: 0b01,
  /** MPEG Version 2 (ISO/IEC 13818-3). */
  MPEG_2: 0b10,
  /** MPEG Version 1 (ISO/IEC 11172-3). */
  MPEG_1: 0b11,
} as const;

/**
 * Values used by the `layer` field.
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { MP3_LAYER } from "@binstruct/mp3";
 *
 * assertEquals(MP3_LAYER.LAYER_3, 0b01);
 * ```
 */
export const MP3_LAYER = {
  /** Reserved — not a valid layer. */
  RESERVED: 0b00,
  /** Layer III — the format commonly called "MP3". */
  LAYER_3: 0b01,
  /** Layer II. */
  LAYER_2: 0b10,
  /** Layer I. */
  LAYER_1: 0b11,
} as const;

/**
 * Values used by the `channelMode` field.
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { MP3_CHANNEL_MODE } from "@binstruct/mp3";
 *
 * assertEquals(MP3_CHANNEL_MODE.STEREO, 0b00);
 * assertEquals(MP3_CHANNEL_MODE.MONO, 0b11);
 * ```
 */
export const MP3_CHANNEL_MODE = {
  /** Two independently encoded channels. */
  STEREO: 0b00,
  /** Stereo encoded with joint-stereo techniques; see `modeExtension`. */
  JOINT_STEREO: 0b01,
  /** Two channels encoded as if unrelated (two mono streams). */
  DUAL_CHANNEL: 0b10,
  /** Single channel. */
  MONO: 0b11,
} as const;

/**
 * Decoded MP3 (MPEG audio) frame header.
 *
 * @property frameSync         - 11-bit frame sync marker. Always {@linkcode MP3_FRAME_SYNC} in a valid header.
 * @property mpegVersion       - MPEG version. See {@linkcode MP3_MPEG_VERSION}.
 * @property layer             - MPEG layer. See {@linkcode MP3_LAYER}.
 * @property protectionAbsent  - `1` if no CRC follows the header, `0` if a 16-bit CRC follows.
 * @property bitrateIndex      - Index into a version/layer-specific bitrate table (not resolved by this package).
 * @property samplingRateIndex - Index into a version-specific sample-rate table (not resolved by this package).
 * @property padding           - `1` if the frame carries one extra padding slot.
 * @property privateBit        - Format-defined bit, not interpreted by this package.
 * @property channelMode       - Channel mode. See {@linkcode MP3_CHANNEL_MODE}.
 * @property modeExtension     - Joint-stereo technique selector, only meaningful when `channelMode` is `JOINT_STEREO`.
 * @property copyright         - `1` if the material is copyrighted.
 * @property original          - `1` if this is the original media.
 * @property emphasis          - De-emphasis to apply on playback.
 */
export interface Mp3FrameHeader {
  frameSync: number;
  mpegVersion: number;
  layer: number;
  protectionAbsent: number;
  bitrateIndex: number;
  samplingRateIndex: number;
  padding: number;
  privateBit: number;
  channelMode: number;
  modeExtension: number;
  copyright: number;
  original: number;
  emphasis: number;
}

/**
 * Creates a coder for a 4-byte MP3 (MPEG audio) frame header.
 *
 * Nothing is validated on encode or decode — `frameSync`, bitrate/sample-rate
 * indices, and every other field are written and read exactly as given.
 * Resolving `bitrateIndex` / `samplingRateIndex` to real values, computing
 * frame length, and locating the next frame are all out of scope for v0.0.1.
 *
 * @returns A coder for {@linkcode Mp3FrameHeader} values.
 *
 * @example Decode a known MPEG-1 Layer III header
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import {
 *   MP3_CHANNEL_MODE,
 *   MP3_FRAME_SYNC,
 *   MP3_LAYER,
 *   MP3_MPEG_VERSION,
 *   mp3FrameHeader,
 * } from "@binstruct/mp3";
 *
 * // deno-fmt-ignore
 * const wire = new Uint8Array([0xff, 0xfb, 0x90, 0x00]);
 *
 * const [decoded, read] = mp3FrameHeader().decode(wire);
 *
 * assertEquals(read, 4);
 * assertEquals(decoded.frameSync, MP3_FRAME_SYNC);
 * assertEquals(decoded.mpegVersion, MP3_MPEG_VERSION.MPEG_1);
 * assertEquals(decoded.layer, MP3_LAYER.LAYER_3);
 * assertEquals(decoded.protectionAbsent, 1);
 * assertEquals(decoded.bitrateIndex, 9);
 * assertEquals(decoded.samplingRateIndex, 0);
 * assertEquals(decoded.channelMode, MP3_CHANNEL_MODE.STEREO);
 * ```
 */
export function mp3FrameHeader(): Coder<Mp3FrameHeader> {
  return bitStruct({
    frameSync: 11,
    mpegVersion: 2,
    layer: 2,
    protectionAbsent: 1,
    bitrateIndex: 4,
    samplingRateIndex: 2,
    padding: 1,
    privateBit: 1,
    channelMode: 2,
    modeExtension: 2,
    copyright: 1,
    original: 1,
    emphasis: 2,
  });
}
