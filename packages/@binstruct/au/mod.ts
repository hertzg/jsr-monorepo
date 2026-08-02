/**
 * Sun/NeXT audio (`.au` / `.snd`) file header encoding and decoding.
 *
 * An `.au` file opens with a 24-byte big-endian header, an optional
 * variable-length annotation field, and then the raw audio samples:
 *
 * ```text
 *  0      7 8     15 16    23 24    31
 * +--------+--------+--------+--------+
 * |         Magic (".snd")            |
 * +--------+--------+--------+--------+
 * |           Data Offset             |
 * +--------+--------+--------+--------+
 * |            Data Size              |
 * +--------+--------+--------+--------+
 * |            Encoding               |
 * +--------+--------+--------+--------+
 * |           Sample Rate             |
 * +--------+--------+--------+--------+
 * |            Channels               |
 * +--------+--------+--------+--------+
 * |     Annotation (variable)         |
 * +-----------------------------------+
 * ```
 *
 * Every field is big-endian regardless of the host platform — the format
 * originates from big-endian Sun hardware and never gained a little-endian
 * variant.
 *
 * `dataOffset` is the byte offset from the start of the file to the first
 * audio sample, so the annotation field is `dataOffset - 24` bytes long and is
 * conventionally used for a NUL-padded comment. The minimum legal
 * `dataOffset` is therefore 24 (empty annotation).
 *
 * This coder covers the header and annotation only. Audio samples are left to
 * the caller: `dataSize` is permitted to be `0xffffffff`
 * ({@linkcode AU_DATA_SIZE_UNKNOWN}) meaning "unknown, read to end of file",
 * which no fixed-length coder can express.
 *
 * @example Round-trip a 16-bit stereo header
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { auHeader, AU_ENCODING, AU_MAGIC } from "@binstruct/au";
 *
 * const coder = auHeader();
 * const header = {
 *   magic: AU_MAGIC,
 *   dataOffset: 24,
 *   dataSize: 1024,
 *   encoding: AU_ENCODING.LINEAR_16,
 *   sampleRate: 44100,
 *   channels: 2,
 *   annotation: new Uint8Array(0),
 * };
 *
 * const buffer = new Uint8Array(24);
 * const written = coder.encode(header, buffer);
 * const [decoded, read] = coder.decode(buffer);
 *
 * assertEquals(written, 24);
 * assertEquals(read, 24);
 * assertEquals(decoded.sampleRate, 44100);
 * assertEquals(decoded.channels, 2);
 * assertEquals(decoded.encoding, AU_ENCODING.LINEAR_16);
 * ```
 *
 * @module
 */

import {
  bytes,
  type Coder,
  computedRef,
  ref,
  struct,
  u32be,
} from "@hertzg/binstruct";

/**
 * Size in bytes of the fixed portion of an `.au` header, before the
 * annotation field. Also the minimum legal value of `dataOffset`.
 */
export const AU_HEADER_SIZE = 24;

/**
 * The `.au` magic number — the ASCII bytes `.snd` read as a big-endian
 * 32-bit integer (`0x2e736e64`).
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { AU_MAGIC } from "@binstruct/au";
 *
 * assertEquals(AU_MAGIC, 0x2e736e64);
 * assertEquals(String.fromCharCode(0x2e, 0x73, 0x6e, 0x64), ".snd");
 * ```
 */
export const AU_MAGIC = 0x2e736e64;

/**
 * Sentinel `dataSize` meaning the sample count is not recorded in the header
 * and the audio runs to the end of the file.
 */
export const AU_DATA_SIZE_UNKNOWN = 0xffffffff;

/**
 * Encoding values used by the `.au` `encoding` field.
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { AU_ENCODING } from "@binstruct/au";
 *
 * assertEquals(AU_ENCODING.MULAW_8, 1);
 * assertEquals(AU_ENCODING.LINEAR_16, 3);
 * ```
 */
export const AU_ENCODING = {
  /** 8-bit G.711 µ-law */
  MULAW_8: 1,
  /** 8-bit linear PCM */
  LINEAR_8: 2,
  /** 16-bit linear PCM */
  LINEAR_16: 3,
  /** 24-bit linear PCM */
  LINEAR_24: 4,
  /** 32-bit linear PCM */
  LINEAR_32: 5,
  /** 32-bit IEEE floating point */
  FLOAT_32: 6,
  /** 64-bit IEEE floating point */
  FLOAT_64: 7,
  /** 8-bit G.711 A-law */
  ALAW_8: 27,
} as const;

/**
 * Decoded `.au` file header.
 *
 * @property magic       - Always {@linkcode AU_MAGIC} for a valid file; surfaced verbatim rather than validated.
 * @property dataOffset  - Byte offset from the start of the file to the first audio sample. At least {@linkcode AU_HEADER_SIZE}.
 * @property dataSize    - Audio payload size in bytes, or {@linkcode AU_DATA_SIZE_UNKNOWN}.
 * @property encoding    - Sample encoding. See {@linkcode AU_ENCODING}.
 * @property sampleRate  - Sample rate in hertz.
 * @property channels    - Interleaved channel count.
 * @property annotation  - Annotation field, `dataOffset - 24` bytes. Conventionally a NUL-padded ASCII comment.
 */
export interface AuHeader {
  magic: number;
  dataOffset: number;
  dataSize: number;
  encoding: number;
  sampleRate: number;
  channels: number;
  annotation: Uint8Array;
}

/**
 * Creates a coder for a Sun/NeXT `.au` file header.
 *
 * The annotation field's length is derived from `dataOffset`
 * (`dataOffset - 24`), so a header with no annotation needs
 * `dataOffset = 24` and an empty `annotation`.
 *
 * Nothing is validated or computed on encode — `magic`, `dataOffset` and
 * `dataSize` are written exactly as given. Set `dataOffset` to
 * `24 + annotation.length` yourself.
 *
 * @returns A coder for {@linkcode AuHeader} values.
 *
 * @example Header carrying an annotation
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { auHeader, AU_ENCODING, AU_HEADER_SIZE, AU_MAGIC } from "@binstruct/au";
 *
 * const annotation = new TextEncoder().encode("take 1\0\0");
 * const coder = auHeader();
 * const header = {
 *   magic: AU_MAGIC,
 *   dataOffset: AU_HEADER_SIZE + annotation.length,
 *   dataSize: 8000,
 *   encoding: AU_ENCODING.MULAW_8,
 *   sampleRate: 8000,
 *   channels: 1,
 *   annotation,
 * };
 *
 * const buffer = new Uint8Array(64);
 * const written = coder.encode(header, buffer);
 * const [decoded, read] = coder.decode(buffer.subarray(0, written));
 *
 * assertEquals(written, AU_HEADER_SIZE + annotation.length);
 * assertEquals(read, written);
 * assertEquals(decoded.annotation, annotation);
 * assertEquals(decoded.dataOffset, 32);
 * ```
 *
 * @example Unknown data size
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { auHeader, AU_DATA_SIZE_UNKNOWN } from "@binstruct/au";
 *
 * // deno-fmt-ignore
 * const wire = new Uint8Array([
 *   0x2e, 0x73, 0x6e, 0x64,
 *   0x00, 0x00, 0x00, 0x18,
 *   0xff, 0xff, 0xff, 0xff,
 *   0x00, 0x00, 0x00, 0x01,
 *   0x00, 0x00, 0x1f, 0x40,
 *   0x00, 0x00, 0x00, 0x01,
 * ]);
 *
 * const [decoded, read] = auHeader().decode(wire);
 *
 * assertEquals(read, 24);
 * assertEquals(decoded.dataSize, AU_DATA_SIZE_UNKNOWN);
 * assertEquals(decoded.sampleRate, 8000);
 * assertEquals(decoded.annotation.length, 0);
 * ```
 */
export function auHeader(): Coder<AuHeader> {
  const dataOffset = u32be();

  return struct({
    magic: u32be(),
    dataOffset,
    dataSize: u32be(),
    encoding: u32be(),
    sampleRate: u32be(),
    channels: u32be(),
    annotation: bytes(
      computedRef([ref(dataOffset)], (offset) => offset - AU_HEADER_SIZE),
    ),
  });
}
