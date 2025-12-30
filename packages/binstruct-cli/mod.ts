/**
 * Binary Structure CLI Tool
 *
 * A command-line interface for decoding binary files using binstruct packages.
 * This package provides a unified CLI for working with various binary formats
 * through JSR packages.
 *
 * The CLI supports both decoding binary data from stdin to JSON on stdout
 * and encoding JSON data from stdin to binary on stdout, making it easy to
 * integrate with shell pipelines and other tools. JSONC is the default format.
 *
 * @example Basic decode usage (with flags) - JSON output
 * ```bash
 * deno run -A @binstruct/cli -p jsr:@binstruct/png -c pngFile decode < input.png > struct.json
 * ```
 *
 * @example Basic decode usage (positional arguments) - JSON output
 * ```bash
 * deno run -A @binstruct/cli jsr:@binstruct/png pngFile decode < input.png > struct.json
 * ```
 *
 * @example Basic encode usage (with flags) - JSON input
 * ```bash
 * deno run -A @binstruct/cli -p jsr:@binstruct/png -c pngFile encode < struct.json > output.png
 * ```
 *
 * @example With custom package (positional arguments) - JSON format
 * ```bash
 * deno run -A @binstruct/cli ./my-package myStruct decode < input.bin > output.json
 * deno run -A @binstruct/cli ./my-package myStruct encode < input.json > output.bin
 * ```
 *
 * @example Programmatic usage
 * ```ts
 * import { main } from "@binstruct/cli";
 *
 * // Run CLI with custom arguments
 * await main(["--help"]);
 * ```
 *
 * @module
 */

import { main } from "./cli.ts";
export { main } from "./cli.ts";
export type { CliOptions } from "./cli.ts";

if (import.meta.main) {
  await main(Deno.args);
}
