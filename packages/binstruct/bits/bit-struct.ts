/**
 * Bit-packed structure coder for encoding and decoding bit-level fields.
 *
 * Creates a {@link import("../core.ts").Coder} for structures where fields are not byte-aligned.
 * All fields are encoded/decoded using MSB-first bit ordering.
 *
 * @module
 */

import { type Coder, createContext, kCoderKind } from "../core.ts";
import { refSetValue } from "../ref/ref.ts";
import { BitDataView } from "./view.ts";

const kKindBitStruct = Symbol("bitStruct");

/**
 * Schema type for bitStruct, mapping field names to bit counts.
 */
export type BitSchema = Record<string, number>;

/**
 * Type of the decoded value from a bitStruct.
 * All fields are decoded as numbers.
 */
export type BitStructDecoded<T extends BitSchema> = {
  [K in keyof T]: number;
};

/**
 * Creates a Coder for bit-packed structures with MSB-first ordering.
 *
 * This function creates a coder for structures where fields are packed at the bit level,
 * allowing for efficient binary representations of small values. Fields are encoded in
 * declaration order with MSB-first bit ordering.
 *
 * ## Constraints
 * - Each field must specify bit count between 1-32
 * - Total bits across all fields must be a multiple of 8
 * - Values are treated as unsigned integers
 * - MSB-first bit ordering (bit 7 is written/read first)
 *
 * ## Ref Integration
 * - Refs work on the entire bitStruct result, not individual fields
 * - Use `ref(bitStructCoder)` to reference the decoded object
 *
 * ## Performance
 * This coder is optimized for small, bit-aligned structures common in network
 * protocols and binary file formats.
 *
 * @param schema - Object mapping field names to bit counts (1-32)
 * @returns A Coder that encodes/decodes bit-packed structures
 * @throws {Error} If any bit count is not an integer between 1-32
 * @throws {Error} If total bits is not a multiple of 8
 *
 * @example Simple flags with padding
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { bitStruct } from "@hertzg/binstruct/bits";
 *
 * // 8-bit flags structure
 * const flags = bitStruct({
 *   ready: 1,
 *   error: 1,
 *   mode: 2,
 *   _reserved: 4,  // Padding to reach 8 bits
 * });
 *
 * const buffer = new Uint8Array(1);
 * const bytesWritten = flags.encode(
 *   { ready: 1, error: 0, mode: 3, _reserved: 0 },
 *   buffer
 * );
 *
 * assertEquals(buffer[0], 0b1_0_11_0000);
 * assertEquals(bytesWritten, 1);
 *
 * const [decoded, bytesRead] = flags.decode(buffer);
 * assertEquals(decoded.ready, 1);
 * assertEquals(decoded.mode, 3);
 * assertEquals(bytesRead, 1);
 * ```
 *
 * @example Multi-byte network protocol header
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { bitStruct } from "@hertzg/binstruct/bits";
 *
 * // 32-bit protocol header
 * const header = bitStruct({
 *   version: 4,      // 4 bits
 *   type: 4,         // 4 bits
 *   flags: 8,        // 8 bits
 *   length: 16,      // 16 bits
 * });                // Total: 32 bits = 4 bytes
 *
 * const buffer = new Uint8Array(4);
 * const data = { version: 1, type: 2, flags: 0xFF, length: 1024 };
 *
 * header.encode(data, buffer);
 * const [decoded, bytesRead] = header.decode(buffer);
 *
 * assertEquals(decoded, data);
 * assertEquals(bytesRead, 4);
 * ```
 *
 * @example With struct composition
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { bitStruct } from "@hertzg/binstruct/bits";
 * import { struct } from "@hertzg/binstruct/struct";
 * import { u32le } from "@hertzg/binstruct/numeric";
 *
 * const flags = bitStruct({
 *   compressed: 1,
 *   encrypted: 1,
 *   version: 6,
 * });
 *
 * const packet = struct({
 *   flags: flags,
 *   payloadSize: u32le(),
 * });
 *
 * const buffer = new Uint8Array(5);
 * const data = {
 *   flags: { compressed: 1, encrypted: 0, version: 2 },
 *   payloadSize: 1024,
 * };
 *
 * packet.encode(data, buffer);
 * const [decoded] = packet.decode(buffer);
 *
 * assertEquals(decoded.flags.compressed, 1);
 * assertEquals(decoded.flags.version, 2);
 * assertEquals(decoded.payloadSize, 1024);
 * ```
 */
export function bitStruct<T extends BitSchema>(
  schema: T,
): Coder<BitStructDecoded<T>> {
  const fields = Object.entries(schema) as [keyof T, number][];

  // Validate each field's bit count
  let totalBits = 0;
  for (const [key, bitCount] of fields) {
    if (
      !Number.isInteger(bitCount) || bitCount < 1 || bitCount > 32
    ) {
      throw new Error(
        `Invalid bit count for field "${
          String(key)
        }": ${bitCount}. Must be integer 1-32.`,
      );
    }
    totalBits += bitCount;
  }

  if (totalBits % 8 !== 0) {
    const currentBytes = Math.floor(totalBits / 8);
    const nextByteAlignment = (currentBytes + 1) * 8;
    const paddingNeeded = nextByteAlignment - totalBits;

    throw new Error(
      `Total bits (${totalBits}) must be a multiple of 8. ` +
        `Add ${paddingNeeded} padding bit(s) to reach ${nextByteAlignment} bits (${
          nextByteAlignment / 8
        } bytes). ` +
        `Consider adding: { _padding: ${paddingNeeded} }`,
    );
  }

  const totalBytes = totalBits / 8;

  let self: Coder<BitStructDecoded<T>>;
  return self = {
    [kCoderKind]: kKindBitStruct,
    encode: (decoded, target, context) => {
      const ctx = context ?? createContext("encode");
      const view = new BitDataView(target);

      let byteOffset = 0;
      let bitOffset = 0;

      // Process fields in declaration order
      for (const [key, bitCount] of fields) {
        const value = decoded[key];

        // Validate value fits in bitCount bits
        const maxValue = bitCount === 32 ? 0xFFFFFFFF : (1 << bitCount) - 1;
        if (value < 0 || value > maxValue) {
          throw new Error(
            `Value ${value} for field "${
              String(key)
            }" exceeds ${bitCount}-bit range (0-${maxValue})`,
          );
        }

        view.setBits(byteOffset, bitOffset, value, bitCount);

        // Advance bit position
        bitOffset += bitCount;
        if (bitOffset >= 8) {
          byteOffset += Math.floor(bitOffset / 8);
          bitOffset %= 8;
        }
      }

      // Store entire struct result in context for refs
      refSetValue(ctx, self, decoded);

      return totalBytes;
    },
    decode: (encoded, context) => {
      const ctx = context ?? createContext("decode");

      // Validate buffer size
      if (encoded.length < totalBytes) {
        throw new Error(
          `Need ${totalBytes} bytes, got ${encoded.length}`,
        );
      }

      const view = new BitDataView(encoded);
      const result = {} as BitStructDecoded<T>;

      let byteOffset = 0;
      let bitOffset = 0;

      // Process fields in declaration order
      for (const [key, bitCount] of fields) {
        result[key] = view.getBits(byteOffset, bitOffset, bitCount);

        // Advance bit position
        bitOffset += bitCount;
        if (bitOffset >= 8) {
          byteOffset += Math.floor(bitOffset / 8);
          bitOffset %= 8;
        }
      }

      // Store entire struct result in context for refs
      refSetValue(ctx, self, result);

      return [result, totalBytes];
    },
  };
}
