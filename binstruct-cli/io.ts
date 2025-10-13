/**
 * I/O utilities for the Binary Structure CLI.
 *
 * This module provides shared utilities for reading from stdin and writing to stdout,
 * used by both encode and decode commands. It includes support for serializing and
 * deserializing non-JSON-native types like Uint8Array and BigInt, and supports
 * JSONC (JSON with comments) format through @std/jsonc.
 *
 * @module
 */

import { deserializeFromJson, serializeToJson } from "./serialization.ts";

/**
 * Reads binary data from stdin.
 *
 * @returns Binary data as Uint8Array
 */
export async function readStdin(): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  const reader = Deno.stdin.readable.getReader();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  // Combine all chunks into a single Uint8Array
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

/**
 * Reads JSON or JSONC data from stdin and parses it with support for non-native types.
 *
 * This function can reconstruct Uint8Array and BigInt values from their
 * JSON-serialized representations. Supports JSONC (JSON with comments) format.
 *
 * @returns Parsed JSON/JSONC data with non-native types reconstructed
 */
export async function readStdinJson(): Promise<unknown> {
  const binaryData = await readStdin();

  // Convert to string and parse as JSON with reviver support
  const jsonString = new TextDecoder().decode(binaryData);

  try {
    return deserializeFromJson(jsonString);
  } catch (error) {
    throw new Error(
      `Failed to parse JSON/JSONC from stdin: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

/**
 * Writes binary data to stdout.
 *
 * @param data Binary data to write
 */
export async function writeStdout(data: Uint8Array): Promise<void> {
  await Deno.stdout.write(data);
}

/**
 * Writes JSON data to stdout with support for non-native types.
 *
 * This function handles Uint8Array and BigInt values by converting them to
 * JSON-serializable formats that can be reconstructed later.
 *
 * @param data Data to serialize as JSON and write
 */
export async function writeStdoutJson(data: unknown): Promise<void> {
  const jsonString = serializeToJson(data);
  const binaryData = new TextEncoder().encode(jsonString);
  await writeStdout(binaryData);
}
