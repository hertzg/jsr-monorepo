import { isValidLength, type LengthType, tryUnrefLength } from "./length.ts";
import { type Coder, createContext, isCoder } from "./mod.ts";

/**
 * Creates a Coder for strings that automatically chooses between length-prefixed,
 * null-terminated, and fixed-length based on the arguments provided.
 *
 * - If a lengthType coder is provided as the first argument, it creates a length-prefixed string
 * - If no arguments are provided, it creates a null-terminated string
 * - If a length value/reference is provided as the first argument, it creates a fixed-length string
 *
 * @param lengthOrLengthType - Optional length coder (for length-prefixed) or length value/reference (for fixed-length)
 * @param decoderEncoding - Text encoding for decoding (default: "utf-8", only used for fixed-length)
 * @param decoderOptions - Options for the TextDecoder (only used for fixed-length)
 * @returns A Coder that can encode/decode strings
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { string } from "@hertzg/binstruct/string";
 * import { u16le, u8le } from "@hertzg/binstruct/numeric";
 * import { struct } from "@hertzg/binstruct/struct";
 *
 * // Create a struct demonstrating length-prefixed and null-terminated strings
 * const personCoder = struct({
 *   name: string(u16le()),           // Length-prefixed string (uses u16le as length coder)
 *   bio: string(),                   // Null-terminated string (no arguments)
 *   age: u8le(),
 * });
 *
 * const person = {
 *   name: "John Doe",
 *   bio: "Software Developer",
 *   age: 30,
 * };
 *
 * const buffer = new Uint8Array(200);
 * const bytesWritten = personCoder.encode(person, buffer);
 * const [decoded, bytesRead] = personCoder.decode(buffer);
 * assertEquals(decoded.name, person.name);
 * assertEquals(decoded.age, person.age);
 * assertEquals(decoded.bio, person.bio);
 * assertEquals(bytesWritten, bytesRead);
 * ```
 */
export function string(
  lengthOrLengthType?: Coder<number> | LengthType | null,
  decoderEncoding: string = "utf-8",
  decoderOptions: TextDecoderOptions = {},
): Coder<string> {
  // If no arguments provided, create a null-terminated string
  if (lengthOrLengthType == null) {
    return stringNT();
  }

  return isCoder<number>(lengthOrLengthType)
    ? stringLP(lengthOrLengthType)
    : stringFL(lengthOrLengthType, decoderEncoding, decoderOptions);
}

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
    encode: (decoded, target, context) => {
      const ctx = context ?? createContext("encode");
      let cursor = 0;
      const stringBytes = new TextEncoder().encode(decoded);

      // Add the length value to context so refs can resolve it
      ctx.refs.set(lengthType, stringBytes.length);

      cursor += lengthType.encode(
        stringBytes.length,
        target.subarray(cursor),
        ctx,
      );
      target.set(stringBytes, cursor);
      cursor += stringBytes.length;
      return cursor;
    },
    decode: (encoded, context) => {
      const ctx = context ?? createContext("decode");
      let cursor = 0;
      const [length, bytesRead] = lengthType.decode(
        encoded.subarray(cursor),
        ctx,
      );
      cursor += bytesRead;

      // Add the length value to context so refs can resolve it
      ctx.refs.set(lengthType, length);

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
    encode: (decoded, target, context) => {
      const ctx = context ?? createContext("encode");
      const len = tryUnrefLength(byteLength, ctx) ?? decoded.length;

      if (len != null && !isValidLength(len)) {
        throw new Error(
          `Invalid length: ${len}. Must be a non-negative integer.`,
        );
      }

      // Add the length value to context so refs can resolve it
      if (byteLength != null && typeof byteLength === "object") {
        ctx.refs.set(byteLength, len);
      }

      const truncated = target.subarray(0, len);
      const encoded = new TextEncoder().encodeInto(decoded, truncated);
      return encoded.written;
    },
    decode: (encoded, context) => {
      const ctx = context ?? createContext("decode");
      const len = tryUnrefLength(byteLength, ctx) ?? encoded.length;

      if (!isValidLength(len)) {
        throw new Error(
          `Invalid length: ${len}. Must be a non-negative integer.`,
        );
      }

      // Add the length value to context so refs can resolve it
      if (byteLength != null && typeof byteLength === "object") {
        ctx.refs.set(byteLength, len);
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
