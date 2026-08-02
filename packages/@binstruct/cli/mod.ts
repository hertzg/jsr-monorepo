/**
 * Binary Structure CLI Tool
 *
 * A command-line interface for decoding and encoding binary data with any
 * binstruct package. Binary arrives on stdin and JSON5 leaves on stdout, or
 * the other way round, so the tool drops into a shell pipeline.
 *
 * The argument list is a prefix chain, and every prefix of it is a valid
 * invocation:
 *
 * ```
 * binstruct [<package> [<coder> [<command>]]] [options]
 * ```
 *
 * A prefix that stops short prints guidance for the missing word — what it
 * means, the values it may take, and a paste-ready command one step further
 * along — to stderr, and exits 1; `--help` prints the same material to stdout
 * and exits 0. Stdout otherwise carries the payload and nothing else. A bare
 * package name means the `@binstruct` scope on JSR, and a package exposing
 * exactly one zero-argument coder may omit the `<coder>` word.
 *
 * @example Decode with the full three-word form
 * ```bash
 * deno run -A @binstruct/cli png pngFile decode < input.png > struct.json
 * ```
 *
 * @example Encode it back
 * ```bash
 * deno run -A @binstruct/cli png pngFile encode < struct.json > output.png
 * ```
 *
 * @example Omit the coder when the package has only one
 * ```bash
 * deno run -A @binstruct/cli arp decode < arp.bin > arp.json
 * ```
 *
 * @example A local package works the same way
 * ```bash
 * deno run -A @binstruct/cli ./my-package myStruct decode < input.bin > output.json
 * ```
 *
 * @example Programmatic usage: plan an invocation without performing it
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { planCli } from "@binstruct/cli";
 *
 * const plan = await planCli(["png", "pngFile", "decode"]);
 *
 * assertEquals(plan.kind, "run");
 * if (plan.kind === "run") assertEquals(plan.specifier, "jsr:@binstruct/png");
 * ```
 *
 * @module
 */

import { main } from "./cli.ts";
export { explainFailure, main, parseCliArgs, planCli } from "./cli.ts";
export type { CliOptions, CliPlan, CommandName } from "./cli.ts";
export { nearestName, renderGuide } from "./guide.ts";
export type { Guide, GuideNext, GuideOption, GuideOptions } from "./guide.ts";
export {
  diagnoseEmptyDiscovery,
  discoverCoders,
  readDocSurface,
  readSymbolDocs,
} from "./discover.ts";
export type {
  DiscoveredCoder,
  DiscoveryOutcome,
  PackageSurface,
  ToolFailure,
  ToolFailureReason,
} from "./discover.ts";
export { resolveSpecifier, shortenSpecifier } from "./specifier.ts";
export type { ResolvedSpecifier, SpecifierForm } from "./specifier.ts";
export { KNOWN_PACKAGES } from "./registry.ts";

if (import.meta.main) {
  await main(Deno.args);
}
