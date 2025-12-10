/**
 * Serialization utilities for non-native types.
 *
 * This module provides utilities for serializing and deserializing non-native
 * types like Uint8Array and BigInt that are commonly used in binary structures.
 * This ensures that data decoded from binary can be properly serialized to JSONC
 * and then reconstructed when encoding back to binary.
 *
 * Uses @std/jsonc for JSONC parsing with custom logic for handling non-native
 * types during serialization.
 *
 * @module
 */

import JSON5 from "json5";

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
  // First convert non-native types to serializable format
  const serializableValue = convertForSerialization(value);

  // Then format with custom byte array formatting
  return formatJsonWithByteArrays(serializableValue, 0);
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
  const parsed = JSON5.parse(json);

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

/**
 * Converts non-native types to serializable format for JSON serialization.
 *
 * @param value The value to convert
 * @returns Value with non-native types converted to serializable format
 */
function convertForSerialization(value: unknown): unknown {
  if (value instanceof Uint8Array) {
    return {
      $bytes: Array.from(value),
    };
  }

  if (typeof value === "bigint") {
    return {
      $bigint: value.toString(),
    };
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj)) {
      result[key] = convertForSerialization(val);
    }
    return result;
  }

  if (Array.isArray(value)) {
    return value.map(convertForSerialization);
  }

  return value;
}

/**
 * Formats JSON with special handling for byte arrays to display them as blocks of 32 items per line.
 *
 * @param value The value to format
 * @param indentLevel Current indentation level
 * @returns Formatted JSON string
 */
function formatJsonWithByteArrays(value: unknown, indentLevel: number): string {
  const indent = "  ".repeat(indentLevel);
  const nextIndent = "  ".repeat(indentLevel + 1);

  if (value === null) {
    return "null";
  }

  if (typeof value === "string") {
    return JSON5.stringify(value);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "[]";
    }

    // Check if this is a byte array (all numbers 0-255)
    const isByteArray = value.every((item) =>
      typeof item === "number" && item >= 0 && item <= 255
    );

    if (isByteArray) {
      // Format as blocks of 16 items per line with column alignment and ASCII comment
      const lines: string[] = [];
      for (let i = 0; i < value.length; i += 16) {
        const chunk = value.slice(i, i + 16);
        const isLastChunk = i + 16 >= value.length;
        // Format hex values
        const chunkStr = chunk.map((num) =>
          `0x${num.toString(16).padStart(2, "0")}`
        ).join(", ");
        // Generate ASCII representation (printable chars or '.' for non-printable)
        const asciiStr = chunk.map((num) =>
          num >= 0x20 && num <= 0x7e ? String.fromCharCode(num) : "."
        ).join("");
        // Pad hex portion to fixed width for alignment (16 entries * 6 chars each - 2 for last ", ")
        const paddedChunkStr = chunkStr.padEnd(16 * 6 - 2);
        // Add comma before comment (except for last line)
        const comma = isLastChunk ? " " : ",";
        lines.push(`${nextIndent}${paddedChunkStr}${comma} // |${asciiStr}|`);
      }

      return `[\n${lines.join("\n")}\n${indent}]`;
    } else {
      // Regular array formatting
      const items = value.map((item) =>
        `${nextIndent}${formatJsonWithByteArrays(item, indentLevel + 1)}`
      );
      return `[\n${items.join(",\n")}\n${indent}]`;
    }
  }

  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const entries = Object.entries(obj);

    if (entries.length === 0) {
      return "{}";
    }

    const items = entries.map(([key, val]) => {
      const keyStr = JSON5.stringify(key);
      const valStr = formatJsonWithByteArrays(val, indentLevel + 1);
      return `${nextIndent}${keyStr}: ${valStr}`;
    });

    return `{\n${items.join(",\n")}\n${indent}}`;
  }

  return String(value);
}
