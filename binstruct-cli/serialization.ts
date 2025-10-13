/**
 * JSON serialization utilities for non-native types.
 *
 * This module provides utilities for serializing and deserializing non-JSON-native
 * types like Uint8Array and BigInt that are commonly used in binary structures.
 * This ensures that data decoded from binary can be properly serialized to JSON
 * and then reconstructed when encoding back to binary.
 *
 * Uses @std/jsonc for parsing JSONC (JSON with comments) and custom logic for
 * handling non-native types during serialization.
 *
 * @module
 */

import { parse } from "@std/jsonc";

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
 * JSON-serialized representations. Uses @std/jsonc to support JSONC
 * (JSON with comments) format.
 *
 * @param json The JSON or JSONC string to deserialize
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
  // Use @std/jsonc to parse JSONC (JSON with comments)
  const parsed = parse(json);

  // Apply custom reviver for non-native types
  return applyReviver(parsed);
}

/**
 * Recursively applies the reviver function to reconstruct non-native types.
 *
 * @param value The value to process
 * @returns Value with non-native types reconstructed
 */
function applyReviver(value: unknown): unknown {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;

    // Handle Uint8Array reconstruction
    if (obj.$bytes && Array.isArray(obj.$bytes)) {
      return new Uint8Array(obj.$bytes);
    }

    // Handle BigInt reconstruction
    if (obj.$bigint && typeof obj.$bigint === "string") {
      return BigInt(obj.$bigint);
    }

    // Recursively process object properties
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj)) {
      result[key] = applyReviver(val);
    }
    return result;
  }

  if (Array.isArray(value)) {
    return value.map(applyReviver);
  }

  return value;
}
