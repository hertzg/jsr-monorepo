import type { Coder } from "./mod.ts";

/**
 * Creates a Coder for structured data from an object of property names to coders.
 *
 * The struct is encoded by encoding each property in order, and decoded by
 * decoding each property in order and constructing an object.
 *
 * @param schema - Object where keys are property names and values are coders
 * @returns A Coder that can encode/decode objects matching the schema
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { struct } from "@hertzg/binstruct/struct";
 * import { u32be, u8be, f32be } from "@hertzg/binstruct/numeric";
 *
 * const personCoder = struct({
 *   id: u32be,
 *   age: u8be,
 *   height: f32be,
 * });
 *
 * const buffer = new Uint8Array(100);
 * const person = { id: 12345, age: 30, height: 1.75 };
 * const bytesWritten = personCoder.encode(person, buffer);
 * const [decoded, bytesRead] = personCoder.decode(buffer);
 * assertEquals(decoded, person);
 * ```
 */
// deno-lint-ignore no-explicit-any
export function struct<T extends Record<string, Coder<any>>>(
  schema: T,
): Coder<{ [K in keyof T]: T[K] extends Coder<infer U> ? U : never }> {
  const keys = Object.keys(schema) as (keyof T)[];

  return {
    encode: (decoded, target, context) => {
      let cursor = 0;
      for (const key of keys) {
        const coder = schema[key];
        cursor += coder.encode(decoded[key], target.subarray(cursor), context);
      }
      return cursor;
    },
    decode: (encoded, context) => {
      let cursor = 0;
      const result = {} as {
        [K in keyof T]: T[K] extends Coder<infer U> ? U : never;
      };

      for (const key of keys) {
        const coder = schema[key];
        const [value, bytesRead] = coder.decode(
          encoded.subarray(cursor),
          context,
        );
        cursor += bytesRead;
        result[key] = value;
      }

      return [result, cursor];
    },
  };
}
