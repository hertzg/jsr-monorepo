import { type Coder, createContext, kCoderKind } from "../core.ts";
import { isValidLength, type LengthOrRef, lengthRefGet } from "../length.ts";

/**
 * Symbol identifier for fixed-length array coders.
 */
export const kKindArrayFL = Symbol("arrayFL");

/**
 * Creates a Coder for fixed-length arrays of a given element type.
 *
 * This function creates a coder that encodes/decodes arrays with a predetermined
 * number of elements. The length can be specified as either a literal number or
 * a reference to a field that contains the length. During encoding, the array
 * must contain exactly the specified number of elements, or an error is thrown.
 *
 * @param elementType - The coder for individual array elements
 * @param lengthOrRef - The fixed length (number) or reference to a length field. Must be non-negative integer or reference that resolves to one
 * @returns A Coder that can encode/decode arrays of the element type with the specified fixed length
 *
 * @example Fixed-length arrays with literal length
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { arrayFL } from "@hertzg/binstruct/array";
 * import { struct } from "@hertzg/binstruct/struct";
 * import { u8le, u16le } from "@hertzg/binstruct/numeric";
 *
 * // Define a 3D vector structure with exactly 3 components
 * const vec3Coder = struct({
 *   x: u16le(),
 *   y: u16le(),
 *   z: u16le(),
 * });
 *
 * // Define a triangle with exactly 3 vertices
 * const triangleCoder = struct({
 *   vertices: arrayFL(vec3Coder, 3),  // Exactly 3 vertices
 *   color: arrayFL(u8le(), 3),        // RGB color (exactly 3 bytes)
 * });
 *
 * const triangle = {
 *   vertices: [
 *     { x: 0, y: 0, z: 0 },
 *     { x: 100, y: 0, z: 0 },
 *     { x: 50, y: 100, z: 0 },
 *   ],
 *   color: [255, 128, 64],  // Orange color
 * };
 *
 * const buffer = new Uint8Array(100);
 * const bytesWritten = triangleCoder.encode(triangle, buffer);
 * const [decoded, bytesRead] = triangleCoder.decode(buffer);
 *
 * assertEquals(decoded.vertices.length, 3);
 * assertEquals(decoded.color.length, 3);
 * assertEquals(decoded.vertices[0], triangle.vertices[0]);
 * assertEquals(decoded.color, triangle.color);
 * assertEquals(bytesWritten, bytesRead);
 * ```
 *
 * @example Fixed-length arrays with referenced length
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { arrayFL } from "@hertzg/binstruct/array";
 * import { struct } from "@hertzg/binstruct/struct";
 * import { u8le, u16le } from "@hertzg/binstruct/numeric";
 * import { ref } from "@hertzg/binstruct";
 *
 * // Define a structure where array length is specified by a field
 * const itemCount = u16le();
 * const inventoryCoder = struct({
 *   itemCount: itemCount,
 *   items: arrayFL(u8le(), ref(itemCount)),  // Array length from itemCount field
 *   checksum: u16le(),
 * });
 *
 * const inventory = {
 *   itemCount: 5,
 *   items: [10, 20, 30, 40, 50],
 *   checksum: 12345,
 * };
 *
 * const buffer = new Uint8Array(100);
 * const bytesWritten = inventoryCoder.encode(inventory, buffer);
 * const [decoded, bytesRead] = inventoryCoder.decode(buffer);
 *
 * assertEquals(decoded.itemCount, 5);
 * assertEquals(decoded.items.length, 5);
 * assertEquals(decoded.items, inventory.items);
 * assertEquals(decoded.checksum, inventory.checksum);
 * assertEquals(bytesWritten, bytesRead);
 * ```
 */
export function arrayFL<TDecoded>(
  elementType: Coder<TDecoded>,
  lengthOrRef: LengthOrRef,
): Coder<TDecoded[]> {
  return {
    [kCoderKind]: kKindArrayFL,
    encode: (decoded, target, context) => {
      const ctx = context ?? createContext("encode");
      const len = lengthRefGet(ctx, lengthOrRef) ?? decoded.length;

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
          ctx,
        );
      }

      return cursor;
    },
    decode: (encoded, context) => {
      const ctx = context ?? createContext("decode");
      const len = lengthRefGet(ctx, lengthOrRef);

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
          ctx,
        );
        cursor += bytesRead;
        decoded[i] = element;
      }
      return [decoded, cursor];
    },
  };
}
