/**
 * Vendor script that copies HomeBank C source files needed for code generation
 * into the repository. Takes the path to the HomeBank source directory as a CLI
 * argument, resolves header includes from `homebank.h`, copies headers and
 * `hb-xml.c` into `codegen/vendor/homebank/`, and generates a manifest.
 *
 * @module
 */

import { resolveIncludes } from "./include-resolver.ts";
import { join, dirname, fromFileUrl } from "@std/path";

/** Manifest describing the vendored HomeBank source snapshot. */
export interface VendorManifest {
  /** HomeBank version string (e.g. "5.10"). */
  version: string;
  /** Short git commit hash of the HomeBank source. */
  commit: string;
  /** Date when the vendor step was run (ISO date). */
  date: string;
  /** The C source file containing XML parsing logic. */
  xmlSource: string;
  /** Header files resolved from homebank.h. */
  headers: string[];
  /** Map of each header to the headers it directly includes. */
  includeTree: Record<string, string[]>;
}

const VERSION_PATTERN = /#define\s+HB_VERSION\s+"([^"]+)"/;

/**
 * Parses the HomeBank version string from the content of `homebank.h`.
 *
 * Looks for a `#define HB_VERSION "X.Y"` pattern.
 *
 * @param homebankH The content of `homebank.h`.
 * @returns The version string.
 *
 * @example Parse version from header content
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseVersion } from "./vendor.ts";
 *
 * const content = '#define HB_VERSION\t\t"5.10"';
 * assertEquals(parseVersion(content), "5.10");
 * ```
 */
export function parseVersion(homebankH: string): string {
  const match = homebankH.match(VERSION_PATTERN);
  if (!match) {
    throw new Error("Could not find HB_VERSION in homebank.h");
  }
  return match[1];
}

/**
 * Builds a {@linkcode VendorManifest} from the resolved includes and metadata.
 *
 * @param version The HomeBank version string.
 * @param commit The short git commit hash.
 * @param date The ISO date string.
 * @param headers The list of resolved header file names.
 * @param includeTree The include dependency tree.
 * @returns A VendorManifest object.
 *
 * @example Build a manifest
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { buildManifest } from "./vendor.ts";
 *
 * const manifest = buildManifest("5.10", "abc1234", "2026-01-01", ["homebank.h"], { "homebank.h": [] });
 * assertEquals(manifest.version, "5.10");
 * assertEquals(manifest.xmlSource, "hb-xml.c");
 * assertEquals(manifest.headers, ["homebank.h"]);
 * ```
 */
export function buildManifest(
  version: string,
  commit: string,
  date: string,
  headers: string[],
  includeTree: Record<string, string[]>,
): VendorManifest {
  return {
    version,
    commit,
    date,
    xmlSource: "hb-xml.c",
    headers,
    includeTree,
  };
}

/**
 * Gets the short git commit hash for the repository at the given path.
 *
 * @param repoPath Path to the git repository.
 * @returns The short commit hash string.
 */
async function getGitCommit(repoPath: string): Promise<string> {
  const command = new Deno.Command("git", {
    args: ["-C", repoPath, "rev-parse", "--short", "HEAD"],
    stdout: "piped",
    stderr: "piped",
  });
  const output = await command.output();
  if (!output.success) {
    throw new Error(
      `git rev-parse failed: ${new TextDecoder().decode(output.stderr)}`,
    );
  }
  return new TextDecoder().decode(output.stdout).trim();
}

async function main(): Promise<void> {
  const sourcePath = Deno.args[0];
  if (!sourcePath) {
    console.error("Usage: deno run -A codegen/vendor.ts <homebank-src-path>");
    Deno.exit(1);
  }

  const scriptDir = dirname(fromFileUrl(import.meta.url));
  const vendorDir = join(scriptDir, "vendor", "homebank");

  // Resolve includes from homebank.h
  const resolution = resolveIncludes(
    "homebank.h",
    (name) => Deno.readTextFileSync(join(sourcePath, name)),
  );

  // Parse version from homebank.h
  const homebankContent = Deno.readTextFileSync(
    join(sourcePath, "homebank.h"),
  );
  const version = parseVersion(homebankContent);

  // Get git commit
  const commit = await getGitCommit(sourcePath);

  // Ensure vendor directory exists
  await Deno.mkdir(vendorDir, { recursive: true });

  // Copy all resolved header files
  for (const file of resolution.files) {
    const src = join(sourcePath, file);
    const dst = join(vendorDir, file);
    await Deno.copyFile(src, dst);
  }

  // Copy hb-xml.c
  const xmlSrc = join(sourcePath, "hb-xml.c");
  const xmlDst = join(vendorDir, "hb-xml.c");
  await Deno.copyFile(xmlSrc, xmlDst);

  // Generate manifest
  const today = new Date().toISOString().split("T")[0];
  const manifest = buildManifest(
    version,
    commit,
    today,
    resolution.files,
    resolution.includeTree,
  );

  const manifestPath = join(vendorDir, "manifest.json");
  await Deno.writeTextFile(
    manifestPath,
    JSON.stringify(manifest, null, 2) + "\n",
  );

  console.log(`Vendored HomeBank ${version} (${commit}) to ${vendorDir}`);
  console.log(`  Headers: ${resolution.files.length}`);
  console.log(`  XML source: hb-xml.c`);
}

if (import.meta.main) {
  await main();
}
