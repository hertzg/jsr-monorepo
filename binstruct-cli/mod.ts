/**
 * Binary Structure CLI Tool
 *
 * A command-line interface for decoding binary files using binstruct packages.
 * This package provides a unified CLI for working with various binary formats
 * through JSR packages.
 *
 * The CLI supports both decoding binary data from stdin to JSON on stdout
 * and encoding JSON data from stdin to binary on stdout, making it easy to
 * integrate with shell pipelines and other tools.
 *
 * @example Basic decode usage
 * ```bash
 * deno run -A @binstruct/cli -p jsr:@binstruct/png -c pngFile decode < input.png > struct.json
 * ```
 *
 * @example Basic encode usage
 * ```bash
 * deno run -A @binstruct/cli -p jsr:@binstruct/png -c pngFile encode < struct.json > output.png
 * ```
 *
 * @example With custom package
 * ```bash
 * deno run -A @binstruct/cli -p ./my-package -c myStruct decode < input.bin > output.json
 * deno run -A @binstruct/cli -p ./my-package -c myStruct encode < input.json > output.bin
 * ```
 *
 * @example Programmatic usage
 * ```ts
 * import { main } from "@binstruct/cli";
 *
 * // Run CLI with custom arguments
 * await main(["-p", "jsr:@binstruct/png", "-c", "pngFile", "decode"]);
 * await main(["-p", "jsr:@binstruct/png", "-c", "pngFile", "encode"]);
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
