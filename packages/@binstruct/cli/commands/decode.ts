/**
 * Decode command implementation for the Binary Structure CLI.
 *
 * This module handles the decode command which reads binary data from stdin,
 * decodes it using a specified coder from a package, and outputs the result
 * as JSON5 to stdout.
 *
 * @module
 */

import { loadCoder, type LoadCoderOptions } from "../loader.ts";
import { readStdin, writeStdoutFormatted } from "../io.ts";

/**
 * Executes the decode command.
 *
 * Reads binary data from stdin, loads the specified coder from the given package,
 * decodes the data, and outputs the result as JSON5 to stdout.
 *
 * @param packageSpec Package specifier (JSR URL, local path, or npm package)
 * @param coderName Name of the coder to use from the package
 * @param format Output format: "jsonc" (default)
 * @param options What the caller already knows about the factory, forwarded to {@linkcode loadCoder}
 */
export async function decodeCommand(
  packageSpec: string,
  coderName: string,
  format: string = "jsonc",
  options: LoadCoderOptions = {},
): Promise<void> {
  // Load the package and get the coder
  const coder = await loadCoder(packageSpec, coderName, options);

  // Read binary data from stdin
  const binaryData = await readStdin();

  // Decode the data
  const decoded = coder.decode(binaryData);

  // Output as JSON5 to stdout
  await writeStdoutFormatted(decoded[0], format);
}
