/**
 * Encode command implementation for the Binary Structure CLI.
 *
 * This module handles the encode command which reads JSON data from stdin,
 * encodes it using a specified coder from a package, and outputs the result
 * as binary data to stdout.
 *
 * @module
 */

import { loadCoder } from "../loader.ts";
import { readStdinJson, writeStdout } from "../io.ts";

/**
 * Executes the encode command.
 *
 * Reads JSON data from stdin, loads the specified coder from the given package,
 * encodes the data, and outputs the result as binary data to stdout.
 *
 * @param packageSpec Package specifier (JSR URL, local path, or npm package)
 * @param coderName Name of the coder to use from the package
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { encodeCommand } from "./encode.ts";
 *
 * // This would be called from the CLI
 * const result = encodeCommand("jsr:@binstruct/png", "pngFile");
 * assertEquals(result instanceof Promise, true);
 * ```
 */
export async function encodeCommand(
  packageSpec: string,
  coderName: string,
): Promise<void> {
  // Load the package and get the coder
  const coder = await loadCoder(packageSpec, coderName);

  // Read JSON data from stdin
  const jsonData = await readStdinJson();

  // Encode the data
  const buffer = new Uint8Array(1024 * 1024); // 1MB buffer
  const bytesWritten = coder.encode(jsonData, buffer);

  // Output binary data to stdout
  await writeStdout(buffer.subarray(0, bytesWritten));
}
