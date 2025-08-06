import {
  type Coder,
  isValidLength,
  type LengthType,
  tryUnrefLength,
} from "./mod.ts";

/**
 * Creates a Coder for length-prefixed strings.
 *
 * The string is encoded with a length prefix followed by the string bytes.
 * The length is encoded using the provided lengthType coder.
 *
 * @param lengthType - The coder for the string length (typically u32 or u16)
 * @returns A Coder that can encode/decode length-prefixed strings
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { stringLP } from "@hertzg/binstruct/string";
 * import { u16le, u32le } from "@hertzg/binstruct/numeric";
 * import { struct } from "@hertzg/binstruct/struct";
 *
 * // Define a file metadata structure with length-prefixed strings
 * const fileMetadataCoder = struct({
 *   filename: stringLP(u16le()),    // Filename with 16-bit length prefix
 *   description: stringLP(u32le()), // Description with 32-bit length prefix
 *   author: stringLP(u16le()),      // Author name with 16-bit length prefix
 *   version: u16le(),               // Version number
 * });
 *
 * // Create sample file metadata
 * const metadata = {
 *   filename: "document.txt",
 *   description: "A sample text document with metadata",
 *   author: "John Doe",
 *   version: 1,
 * };
 *
 * const buffer = new Uint8Array(200);
 * const bytesWritten = fileMetadataCoder.encode(metadata, buffer);
 * const [decoded, bytesRead] = fileMetadataCoder.decode(buffer);
 * assertEquals(decoded, metadata);
 * assertEquals(bytesWritten, bytesRead);
 * ```
 */
export function stringLP(lengthType: Coder<number>): Coder<string> {
  return {
    encode: (decoded, target) => {
      let cursor = 0;
      const stringBytes = new TextEncoder().encode(decoded);
      cursor += lengthType.encode(stringBytes.length, target.subarray(cursor));
      target.set(stringBytes, cursor);
      cursor += stringBytes.length;
      return cursor;
    },
    decode: (encoded) => {
      let cursor = 0;
      const [length, bytesRead] = lengthType.decode(encoded.subarray(cursor));
      cursor += bytesRead;

      const stringBytes = encoded.subarray(cursor, cursor + length);
      const decoded = new TextDecoder().decode(stringBytes);
      cursor += length;

      return [decoded, cursor];
    },
  };
}

/**
 * Creates a Coder for null-terminated strings.
 *
 * The string is encoded as UTF-8 bytes followed by a null byte (0x00).
 * Decoding reads until a null byte is encountered.
 *
 * @returns A Coder that can encode/decode null-terminated strings
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { stringNT } from "@hertzg/binstruct/string";
 * import { struct } from "@hertzg/binstruct/struct";
 * import { u16le, u32le } from "@hertzg/binstruct/numeric";
 *
 * // Define a network packet structure with null-terminated strings
 * const networkPacketCoder = struct({
 *   packetId: u32le(),           // Packet identifier
 *   sourceAddress: stringNT(),   // Source IP address (null-terminated)
 *   destinationAddress: stringNT(), // Destination IP address (null-terminated)
 *   protocol: u16le(),           // Protocol type
 *   payload: stringNT(),         // Payload data (null-terminated)
 * });
 *
 * // Create sample network packet
 * const packet = {
 *   packetId: 12345,
 *   sourceAddress: "192.168.1.100",
 *   destinationAddress: "192.168.1.200",
 *   protocol: 80, // HTTP
 *   payload: "GET /index.html HTTP/1.1",
 * };
 *
 * const buffer = new Uint8Array(500);
 * const bytesWritten = networkPacketCoder.encode(packet, buffer);
 * const [decoded, bytesRead] = networkPacketCoder.decode(buffer);
 * assertEquals(decoded, packet);
 * assertEquals(bytesWritten, bytesRead);
 * ```
 */
export function stringNT(): Coder<string> {
  return {
    encode: (decoded, target) => {
      const stringBytes = new TextEncoder().encode(decoded);
      target.set(stringBytes, 0);
      target[stringBytes.length] = 0; // null terminator
      return stringBytes.length + 1;
    },
    decode: (encoded) => {
      let cursor = 0;
      while (cursor < encoded.length && encoded[cursor] !== 0x00) {
        cursor++;
      }

      const stringBytes = encoded.subarray(0, cursor);
      const decoded = new TextDecoder().decode(stringBytes);

      // Include the null terminator in bytes read
      return [decoded, cursor + 1];
    },
  };
}

/**
 * Creates a Coder for fixed-length strings.
 *
 * The string is encoded as UTF-8 bytes with a fixed byte length.
 * The length can be a literal number or a reference that resolves during encoding/decoding.
 * If no length is provided, the string consumes all available bytes.
 *
 * @param byteLength - Optional fixed byte length (can be a number or reference)
 * @param decoderEncoding - Text encoding for decoding (default: "utf-8")
 * @param decoderOptions - Options for the TextDecoder
 * @returns A Coder that can encode/decode fixed-length strings
 */
export function stringFL(
  byteLength?: LengthType,
  decoderEncoding: string = "utf-8",
  decoderOptions: TextDecoderOptions = {},
): Coder<string> {
  return {
    encode: (decoded, target, ctx) => {
      const len = tryUnrefLength(byteLength, ctx) ?? decoded.length;

      if (len != null && !isValidLength(len)) {
        throw new Error(
          `Invalid length: ${len}. Must be a non-negative integer.`,
        );
      }

      const truncated = target.subarray(0, len);
      const encoded = new TextEncoder().encodeInto(decoded, truncated);
      return encoded.written;
    },
    decode: (encoded, ctx) => {
      const len = tryUnrefLength(byteLength, ctx) ?? encoded.length;

      if (!isValidLength(len)) {
        throw new Error(
          `Invalid length: ${len}. Must be a non-negative integer.`,
        );
      }

      const stringBytes = encoded.subarray(0, len ?? undefined);
      const decoded = new TextDecoder(decoderEncoding, {
        fatal: true,
        ignoreBOM: true,
        ...decoderOptions,
      }).decode(
        stringBytes,
      );

      return [decoded, stringBytes.length];
    },
  };
}
