/**
 * MikroTik API variable-length encoding
 *
 * Encodes/decodes integer lengths using 1-5 bytes:
 * - 0-127: 1 byte
 * - 128-16383: 2 bytes (0x80 prefix)
 * - 16384-2097151: 3 bytes (0xC0 prefix)
 * - 2097152-268435455: 4 bytes (0xE0 prefix)
 * - 268435456+: 5 bytes (0xF0 prefix)
 */

/**
 * Encoded length value as a Uint8Array
 *
 * The byte array uses MikroTik's variable-length encoding format where the
 * first byte indicates the total length of the encoding (1-5 bytes).
 */
export type EncodedLength = Uint8Array;

/**
 * Decoded length value with metadata
 *
 * Contains the decoded length value and the number of bytes consumed from
 * the source buffer during decoding.
 */
export type DecodedLength = {
  /** The decoded length value */
  length: number;
  /** Number of bytes read from the buffer */
  bytesRead: number;
};

/**
 * Encodes a length value into MikroTik API format
 *
 * Uses variable-length encoding where the first byte(s) indicate the size:
 * - 1 byte for 0-127
 * - 2 bytes for 128-16,383
 * - 3 bytes for 16,384-2,097,151
 * - 4 bytes for 2,097,152-268,435,455
 * - 5 bytes for 268,435,456-34,359,738,367
 *
 * @param length - The non-negative integer length to encode (max 0x7FFFFFFFF)
 * @returns Encoded length as a Uint8Array (1-5 bytes)
 *
 * @example Encode small lengths (1 byte)
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { encodeLength } from "@hertzg/routeros-api/encoding/length";
 *
 * const encoded = encodeLength(42);
 * assertEquals(encoded, new Uint8Array([0x2A]));
 * assertEquals(encoded.length, 1);
 * ```
 *
 * @example Encode medium lengths (2 bytes)
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { encodeLength } from "@hertzg/routeros-api/encoding/length";
 *
 * const encoded = encodeLength(1000);
 * assertEquals(encoded, new Uint8Array([0x83, 0xE8]));
 * assertEquals(encoded.length, 2);
 * ```
 *
 * @example Encode large lengths (5 bytes)
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { encodeLength } from "@hertzg/routeros-api/encoding/length";
 *
 * const encoded = encodeLength(268435456);
 * assertEquals(encoded.length, 5);
 * assertEquals(encoded[0], 240); // First byte indicates 5-byte encoding
 * ```
 */
export function encodeLength(length: number): EncodedLength {
  if (length < 0) {
    throw new RangeError(`Length must be non-negative, got ${length}`);
  }

  if (length <= 0x7F) {
    // 1 byte: 0xxxxxxx
    return new Uint8Array([length]);
  } else if (length <= 0x3FFF) {
    // 2 bytes: 10xxxxxx xxxxxxxx
    return new Uint8Array([
      (length >> 8) | 0x80,
      length & 0xFF,
    ]);
  } else if (length <= 0x1FFFFF) {
    // 3 bytes: 110xxxxx xxxxxxxx xxxxxxxx
    return new Uint8Array([
      (length >> 16) | 0xC0,
      (length >> 8) & 0xFF,
      length & 0xFF,
    ]);
  } else if (length <= 0xFFFFFFF) {
    // 4 bytes: 1110xxxx xxxxxxxx xxxxxxxx xxxxxxxx
    return new Uint8Array([
      (length >> 24) | 0xE0,
      (length >> 16) & 0xFF,
      (length >> 8) & 0xFF,
      length & 0xFF,
    ]);
  } else if (length <= 0x7FFFFFFFF) {
    // 5 bytes: 1111xxxx xxxxxxxx xxxxxxxx xxxxxxxx xxxxxxxx (35 bits: 4 + 32)
    // Use division to avoid 32-bit overflow in bitwise operations
    return new Uint8Array([
      0xF0 | (Math.floor(length / 0x100000000) & 0x0F), // bits 32-35
      Math.floor(length / 0x1000000) & 0xFF, // bits 24-31
      Math.floor(length / 0x10000) & 0xFF, // bits 16-23
      Math.floor(length / 0x100) & 0xFF, // bits 8-15
      length & 0xFF, // bits 0-7
    ]);
  } else {
    throw new RangeError(
      `Length ${length} exceeds maximum supported value (0x7FFFFFFFF)`,
    );
  }
}

/**
 * Decodes a length value from MikroTik API format
 *
 * Reads the variable-length encoded integer from the buffer starting at the
 * specified offset. The first byte indicates how many bytes to read (1-5).
 *
 * @param bytes - The byte array containing the encoded length
 * @param options - Optional decoding options
 * @param options.offset - Byte offset to start reading from (default: 0)
 * @returns Object containing the decoded length and bytes consumed
 *
 * @example Decode single-byte length
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { decodeLength } from "@hertzg/routeros-api/encoding/length";
 *
 * const result = decodeLength(new Uint8Array([0x2A]));
 * assertEquals(result.length, 42);
 * assertEquals(result.bytesRead, 1);
 * ```
 *
 * @example Decode with offset
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { decodeLength } from "@hertzg/routeros-api/encoding/length";
 *
 * const buffer = new Uint8Array([0xFF, 0xFF, 0x83, 0xE8]);
 * const result = decodeLength(buffer, { offset: 2 });
 * assertEquals(result.length, 1000);
 * assertEquals(result.bytesRead, 2);
 * ```
 *
 * @example Round-trip encoding and decoding
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { encodeLength, decodeLength } from "@hertzg/routeros-api/encoding/length";
 *
 * const original = 65535;
 * const encoded = encodeLength(original);
 * const decoded = decodeLength(encoded);
 *
 * assertEquals(decoded.length, original);
 * assertEquals(decoded.bytesRead, encoded.length);
 * ```
 */
export function decodeLength(
  bytes: Uint8Array,
  options?: { offset?: number },
): DecodedLength {
  const offset = options?.offset ?? 0;

  if (offset >= bytes.length) {
    throw new RangeError(
      `Offset ${offset} is out of bounds for array of length ${bytes.length}`,
    );
  }

  const firstByte = bytes[offset];

  if ((firstByte & 0x80) === 0) {
    // 1 byte: 0xxxxxxx
    return {
      length: firstByte,
      bytesRead: 1,
    };
  } else if ((firstByte & 0xC0) === 0x80) {
    // 2 bytes: 10xxxxxx xxxxxxxx
    if (offset + 1 >= bytes.length) {
      throw new RangeError("Incomplete 2-byte length encoding");
    }
    return {
      length: ((firstByte & 0x3F) << 8) | bytes[offset + 1],
      bytesRead: 2,
    };
  } else if ((firstByte & 0xE0) === 0xC0) {
    // 3 bytes: 110xxxxx xxxxxxxx xxxxxxxx
    if (offset + 2 >= bytes.length) {
      throw new RangeError("Incomplete 3-byte length encoding");
    }
    return {
      length: ((firstByte & 0x1F) << 16) |
        (bytes[offset + 1] << 8) |
        bytes[offset + 2],
      bytesRead: 3,
    };
  } else if ((firstByte & 0xF0) === 0xE0) {
    // 4 bytes: 1110xxxx xxxxxxxx xxxxxxxx xxxxxxxx
    if (offset + 3 >= bytes.length) {
      throw new RangeError("Incomplete 4-byte length encoding");
    }
    return {
      length: ((firstByte & 0x0F) << 24) |
        (bytes[offset + 1] << 16) |
        (bytes[offset + 2] << 8) |
        bytes[offset + 3],
      bytesRead: 4,
    };
  } else if ((firstByte & 0xF0) === 0xF0) {
    // 5 bytes: 1111xxxx xxxxxxxx xxxxxxxx xxxxxxxx xxxxxxxx (35 bits: 4 + 32)
    if (offset + 4 >= bytes.length) {
      throw new RangeError("Incomplete 5-byte length encoding");
    }
    // Use multiplication to avoid 32-bit signed integer overflow
    return {
      length: (firstByte & 0x0F) * 0x100000000 + // bits 32-35
        bytes[offset + 1] * 0x1000000 + // bits 24-31
        bytes[offset + 2] * 0x10000 + // bits 16-23
        bytes[offset + 3] * 0x100 + // bits 8-15
        bytes[offset + 4], // bits 0-7
      bytesRead: 5,
    };
  } else {
    throw new Error(
      `Invalid length encoding: first byte = 0x${firstByte.toString(16)}`,
    );
  }
}
