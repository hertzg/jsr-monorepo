import {
  type Coder,
  isValidLength,
  type LengthType,
  tryUnrefLength,
} from "./mod.ts";

/**
 * Creates a Coder for length-prefixed arrays of a given element type.
 *
 * The array is encoded with a length prefix followed by the elements.
 * The length is encoded using the provided lengthType coder.
 *
 * @param elementType - The coder for individual array elements
 * @param lengthType - The coder for the array length (typically u32 or u16)
 * @returns A Coder that can encode/decode arrays of the element type
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { arrayLP } from "@hertzg/binstruct/array";
 * import { u16le, u32le, s32le, f32le, u8le } from "@hertzg/binstruct/numeric";
 * import { struct } from "@hertzg/binstruct/struct";
 * import { stringLP } from "@hertzg/binstruct/string";
 *
 * // Define a vertex structure for 3D graphics
 * const vertexCoder = struct({
 *   x: f32le(), // X coordinate
 *   y: f32le(), // Y coordinate
 *   z: f32le(), // Z coordinate
 *   r: u8le(),  // Red component (0-255)
 *   g: u8le(),  // Green component (0-255)
 *   b: u8le(),  // Blue component (0-255)
 * });
 *
 * // Define a 3D mesh structure with vertex arrays
 * const meshCoder = struct({
 *   meshId: u32le(),                    // Mesh identifier
 *   vertexCount: u16le(),               // Number of vertices
 *   vertices: arrayLP(vertexCoder, u16le()), // Array of vertices
 *   indices: arrayLP(u16le(), u32le()), // Triangle indices
 *   materialName: stringLP(u16le()),    // Material name
 * });
 *
 * // Create sample 3D mesh data
 * const mesh = {
 *   meshId: 1001,
 *   vertexCount: 3,
 *   vertices: [
 *     { x: 0.0, y: 0.0, z: 0.0, r: 255, g: 0, b: 0 },     // Red vertex
 *     { x: 1.0, y: 0.0, z: 0.0, r: 0, g: 255, b: 0 },     // Green vertex
 *     { x: 0.5, y: 1.0, z: 0.0, r: 0, g: 0, b: 255 },     // Blue vertex
 *   ],
 *   indices: [0, 1, 2], // Triangle indices
 *   materialName: "default_material",
 * };
 *
 * const buffer = new Uint8Array(1000);
 * const bytesWritten = meshCoder.encode(mesh, buffer);
 * const [decoded, bytesRead] = meshCoder.decode(buffer);
 * assertEquals(decoded, mesh);
 * assertEquals(bytesWritten, bytesRead);
 * ```
 */
export function arrayLP<TDecoded>(
  elementType: Coder<TDecoded>,
  lengthType: Coder<number>,
): Coder<TDecoded[]> {
  return {
    encode: (decoded, target, context) => {
      let cursor = 0;
      cursor += lengthType.encode(
        decoded.length,
        target.subarray(cursor),
        context,
      );

      for (let i = 0; i < decoded.length; i++) {
        cursor += elementType.encode(
          decoded[i],
          target.subarray(cursor),
          context,
        );
      }
      return cursor;
    },
    decode: (encoded, context) => {
      let cursor = 0;
      const [length, bytesRead] = lengthType.decode(
        encoded.subarray(cursor),
        context,
      );
      cursor += bytesRead;

      const decoded = new Array<TDecoded>(length);
      for (let i = 0; i < length; i++) {
        const [element, bytesRead] = elementType.decode(
          encoded.subarray(cursor),
          context,
        );
        cursor += bytesRead;
        decoded[i] = element;
      }

      return [decoded, cursor];
    },
  };
}

/**
 * Creates a Coder for fixed-length arrays of a given element type.
 *
 * The array is encoded with a fixed number of elements determined by the length parameter.
 * The length can be a literal number or a reference that resolves during encoding/decoding.
 *
 * @param elementType - The coder for individual array elements
 * @param length - The fixed length of the array (can be a number or reference)
 * @returns A Coder that can encode/decode arrays of the element type with fixed length
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { arrayFL } from "@hertzg/binstruct/array";
 * import { u16le, u32le } from "@hertzg/binstruct/numeric";
 * import { struct } from "@hertzg/binstruct/struct";
 *
 * // Define a fixed-size record structure
 * const recordCoder = struct({
 *   recordId: u32le(),                    // Record identifier
 *   dataPoints: arrayFL(u16le(), 4),     // Fixed array of 4 data points
 *   checksum: u16le(),                    // Checksum value
 * });
 *
 * // Create sample record data
 * const record = {
 *   recordId: 1001,
 *   dataPoints: [100, 200, 300, 400],    // Exactly 4 values
 *   checksum: 0xABCD,
 * };
 *
 * const buffer = new Uint8Array(100);
 * const bytesWritten = recordCoder.encode(record, buffer);
 * const [decoded, bytesRead] = recordCoder.decode(buffer);
 * assertEquals(decoded, record);
 * assertEquals(bytesWritten, bytesRead);
 * ```
 */
export function arrayFL<TDecoded>(
  elementType: Coder<TDecoded>,
  length: LengthType,
): Coder<TDecoded[]> {
  return {
    encode: (decoded, target, context) => {
      const len = tryUnrefLength(length, context) ?? decoded.length;

      if (!isValidLength(len)) {
        throw new Error(
          `Invalid length: ${len}. Must be a non-negative integer.`,
        );
      }

      if (len != decoded.length) {
        throw new Error(
          `Invalid length: ${len}. Must be equal to the decoded length.`,
        );
      }

      let cursor = 0;
      for (let i = 0; i < len; i++) {
        cursor += elementType.encode(
          decoded[i],
          target.subarray(cursor),
          context,
        );
      }

      return cursor;
    },
    decode: (encoded, context) => {
      const len = tryUnrefLength(length, context);

      if (len == null || !isValidLength(len)) {
        throw new Error(
          `Invalid length: ${len}. Must be a non-negative integer.`,
        );
      }

      const decoded = new Array<TDecoded>();
      let cursor = 0;
      for (let i = 0; i < len; i++) {
        const [element, bytesRead] = elementType.decode(
          encoded.subarray(cursor),
          context,
        );
        cursor += bytesRead;
        decoded[i] = element;
      }
      return [decoded, cursor];
    },
  };
}
