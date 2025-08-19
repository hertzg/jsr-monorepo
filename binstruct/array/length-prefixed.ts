import { refSetValue } from "../ref/ref.ts";
import { type Coder, createContext, kCoderKind } from "../core.ts";

export const kKindArrayLP = Symbol("arrayLP");

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
  let self: Coder<TDecoded[]>;
  return self = self = {
    [kCoderKind]: kKindArrayLP,
    encode: (decoded, target, context) => {
      const ctx = context ?? createContext("encode");
      let cursor = 0;

      refSetValue(ctx, self, decoded);

      cursor += lengthType.encode(
        decoded.length,
        target.subarray(cursor),
        ctx,
      );

      for (let i = 0; i < decoded.length; i++) {
        cursor += elementType.encode(
          decoded[i],
          target.subarray(cursor),
          ctx,
        );
      }
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

      const decoded = new Array<TDecoded>(length);
      refSetValue(ctx, self, decoded);

      for (let i = 0; i < length; i++) {
        const [element, bytesRead] = elementType.decode(
          encoded.subarray(cursor),
          ctx,
        );
        cursor += bytesRead;
        decoded[i] = element;
      }

      return [decoded, cursor];
    },
  };
}
