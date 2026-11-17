/**
 * I/O utilities for the Binary Structure CLI.
 *
 * This module provides shared utilities for reading from stdin and writing to stdout,
 * used by both encode and decode commands. It includes support for serializing and
 * deserializing non-native types like Uint8Array and BigInt, and accepts JSON5
 * (JSON with comments and trailing commas) on input.
 *
 * @module
 */

import { stdin, stdout } from "node:process";
import { deserializeFromJson, serializeToJson } from "./serialization.ts";

/**
 * Reads binary data from stdin.
 *
 * @returns Binary data as Uint8Array
 */
export async function readStdin(): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];

  for await (const chunk of stdin) {
    chunks.push(chunk);
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
 * Reads JSON or JSON5 data from stdin and parses it with support for non-native types.
 *
 * Reconstructs Uint8Array and BigInt values from their JSON-serialized
 * representations. Comments and trailing commas are accepted.
 *
 * @returns Parsed data with non-native types reconstructed
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
 * Reads formatted data from stdin and parses it with support for non-native types.
 *
 * Currently the only supported format is `"jsonc"`, which parses JSON5
 * (JSON with comments and trailing commas) and reconstructs Uint8Array and
 * BigInt values.
 *
 * @param format The format to parse: "jsonc" (default)
 * @returns Parsed data with non-native types reconstructed
 */
export async function readStdinFormatted(
  format: string = "jsonc",
): Promise<unknown> {
  const binaryData = await readStdin();
  const textString = new TextDecoder().decode(binaryData);

  try {
    if (format === "jsonc") {
      return deserializeFromJson(textString);
    } else {
      throw new Error(
        `Unsupported format: ${format}. Only 'jsonc' is supported.`,
      );
    }
  } catch (error) {
    throw new Error(
      `Failed to parse JSONC from stdin: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

/**
 * Writes binary data to stdout, in full.
 *
 * Returning as soon as the write is handed over is not enough. Stdout may take
 * only part of a buffer at once and queue the rest, and a process that exits
 * before the queue drains drops the tail without a word and still exits 0.
 * Binary output is routinely larger than one write, so this resolves only when
 * the stream reports that every byte has landed, and rejects when it says one
 * did not.
 *
 * @param data Binary data to write
 */
export async function writeStdout(data: Uint8Array): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    stdout.write(data, (error) => error ? reject(error) : resolve());
  });
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

/**
 * Writes formatted data to stdout with support for non-native types.
 *
 * Currently the only supported format is `"jsonc"`, which produces JSON5
 * with hex-formatted byte arrays. Uint8Array and BigInt values are
 * converted to a form that can be round-tripped back via {@link readStdinFormatted}.
 *
 * @param data Data to serialize and write
 * @param format The format to use: "jsonc" (default)
 */
export async function writeStdoutFormatted(
  data: unknown,
  format: string = "jsonc",
): Promise<void> {
  let serializedString: string;

  if (format === "jsonc") {
    serializedString = serializeToJson(data);
  } else {
    throw new Error(
      `Unsupported format: ${format}. Only 'jsonc' is supported.`,
    );
  }

  const binaryData = new TextEncoder().encode(serializedString);
  await writeStdout(binaryData);
}
