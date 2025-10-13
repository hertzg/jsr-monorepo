/**
 * Decode command implementation for the Binary Structure CLI.
 *
 * This module handles the decode command which reads binary data from stdin,
 * decodes it using a specified coder from a package, and outputs the result
 * as JSON to stdout.
 *
 * @module
 */

import { loadCoder } from "../loader.ts";
import { readStdin, writeStdoutJson } from "../io.ts";

/**
 * Executes the decode command.
 *
 * Reads binary data from stdin, loads the specified coder from the given package,
 * decodes the data, and outputs the result as JSON to stdout.
 *
 * @param packageSpec Package specifier (JSR URL, local path, or npm package)
 * @param coderName Name of the coder to use from the package
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { decodeCommand } from "./decode.ts";
 *
 * // This would be called from the CLI
 * const result = decodeCommand("jsr:@binstruct/png", "pngFile");
 * assertEquals(result instanceof Promise, true);
 * ```
 */
export async function decodeCommand(
  packageSpec: string,
  coderName: string,
): Promise<void> {
  // Load the package and get the coder
  const coder = await loadCoder(packageSpec, coderName);

  // Read binary data from stdin
  const binaryData = await readStdin();

  // Decode the data
  const decoded = coder.decode(binaryData);

  // Output as JSON to stdout
  await writeStdoutJson(decoded[0]);
}
