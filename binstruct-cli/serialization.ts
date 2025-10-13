/**
 * JSON serialization utilities for non-native types.
 *
 * This module provides utilities for serializing and deserializing non-JSON-native
 * types like Uint8Array and BigInt that are commonly used in binary structures.
 * This ensures that data decoded from binary can be properly serialized to JSON
 * and then reconstructed when encoding back to binary.
 *
 * @module
 */

/**
 * Serializes a value to JSON with support for non-native types.
 *
 * This function handles Uint8Array and BigInt values by converting them to
 * JSON-serializable formats that can be reconstructed later.
 *
 * @param value The value to serialize
 * @returns JSON string with non-native types converted
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { serializeToJson } from "./serialization.ts";
 *
 * const data = {
 *   bytes: new Uint8Array([1, 2, 3, 4]),
 *   bigNumber: 12345678901234567890n,
 *   regularNumber: 42,
 * };
 *
 * const json = serializeToJson(data);
 * assertEquals(typeof json, "string");
 * ```
 */
export function serializeToJson(value: unknown): string {
  return JSON.stringify(value, (_key, val) => {
    if (val instanceof Uint8Array) {
      return {
        $bytes: Array.from(val),
      };
    }
    if (typeof val === "bigint") {
      return {
        $bigint: val.toString(),
      };
    }
    return val;
  }, 2);
}

/**
 * Deserializes JSON with support for non-native types.
 *
 * This function reconstructs Uint8Array and BigInt values from their
 * JSON-serialized representations.
 *
 * @param json The JSON string to deserialize
 * @returns Deserialized value with non-native types reconstructed
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { deserializeFromJson } from "./serialization.ts";
 *
 * const json = '{"bytes":{"$bytes":[1,2,3,4]},"bigNumber":{"$bigint":"12345678901234567890"},"regularNumber":42}';
 * const data = deserializeFromJson(json) as Record<string, unknown>;
 *
 * assertEquals(data.bytes instanceof Uint8Array, true);
 * assertEquals(data.bigNumber, 12345678901234567890n);
 * assertEquals(data.regularNumber, 42);
 * ```
 */
export function deserializeFromJson(json: string): unknown {
  return JSON.parse(json, (_key, val) => {
    if (val && typeof val === "object" && val.$bytes) {
      return new Uint8Array(val.$bytes);
    }
    if (val && typeof val === "object" && val.$bigint) {
      return BigInt(val.$bigint);
    }
    return val;
  });
}
