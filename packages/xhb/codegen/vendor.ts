/**
 * Vendor script that copies HomeBank C source files needed for code generation
 * into the repository.
 *
 * When a local path is given, vendors from that directory:
 *   `deno run -A codegen/vendor.ts /path/to/homebank/src`
 *
 * When no arguments are given, shallow-clones the latest release branch
 * from the official Launchpad repository into a temp directory, vendors
 * the files, and writes a `source.json` with git metadata alongside the
 * main `manifest.json`:
 *   `deno run -A codegen/vendor.ts`
 *
 * @module
 */

import { resolveIncludes } from "./include-resolver.ts";
import { dirname, fromFileUrl, join } from "@std/path";
import { compare, parse } from "@std/semver";

const REPO_URL = "https://git.launchpad.net/homebank";
const XML_SOURCE = "hb-xml.c";
const DEFAULT_CLONE_DIR = join(
  Deno.env.get("TMPDIR") ?? "/tmp",
  "homebank-vendor",
);

/** Manifest describing the vendored HomeBank source snapshot. */
export interface VendorManifest {
  /** HomeBank version string (e.g. "5.10"). */
  version: string;
  /** The C source file containing XML parsing logic. */
  xmlSource: string;
  /** Map of each header to the headers it directly includes. */
  includeTree: Record<string, string[]>;
}

/** Git metadata written to `source.json` when cloning. */
export interface SourceInfo {
  /** Git remote URL of the HomeBank repository. */
  repositoryUrl: string;
  /** Release branch that was cloned (e.g. "5.10.x"). */
  releaseBranch: string;
  /** Short commit hash at the tip of the branch. */
  commitHash: string;
  /** ISO 8601 timestamp when vendoring was performed. */
  vendoredAt: string;
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
 * @param includeTree The include dependency tree.
 * @returns A VendorManifest object.
 *
 * @example Build a manifest
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { buildManifest } from "./vendor.ts";
 *
 * const manifest = buildManifest("5.10", { "homebank.h": [] });
 * assertEquals(manifest.version, "5.10");
 * assertEquals(manifest.xmlSource, "hb-xml.c");
 * ```
 */
export function buildManifest(
  version: string,
  includeTree: Record<string, string[]>,
): VendorManifest {
  return { version, xmlSource: XML_SOURCE, includeTree };
}

async function run(
  cmd: string,
  args: string[],
  opts?: { cwd?: string },
): Promise<string> {
  const command = new Deno.Command(cmd, {
    args,
    cwd: opts?.cwd,
    stdout: "piped",
    stderr: "piped",
  });
  const output = await command.output();
  if (!output.success) {
    const stderr = new TextDecoder().decode(output.stderr);
    throw new Error(`${cmd} ${args.join(" ")} failed: ${stderr}`);
  }
  return new TextDecoder().decode(output.stdout).trim();
}

/**
 * Parses `git ls-remote --heads` output and returns HomeBank release
 * branches matching the `N.N.x` pattern, sorted by version number
 * (descending, latest first).
 *
 * @param lsRemoteOutput Raw output from `git ls-remote --heads`.
 * @returns Sorted array of release branch names.
 *
 * @example Parse and sort release branches
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseHomebankReleaseBranches } from "./vendor.ts";
 *
 * const output = [
 *   "abc1234\trefs/heads/5.8.x",
 *   "def5678\trefs/heads/5.10.x",
 *   "fed9876\trefs/heads/5.9.x",
 * ].join("\n");
 * assertEquals(parseHomebankReleaseBranches(output), ["5.10.x", "5.9.x", "5.8.x"]);
 * ```
 */
export function parseHomebankReleaseBranches(
  lsRemoteOutput: string,
): string[] {
  const branches = lsRemoteOutput
    .split("\n")
    .map((line) => line.split("\t")[1]?.replace("refs/heads/", ""))
    .filter((name): name is string => !!name && /^\d+\.\d+\.x$/.test(name));

  return branches
    .map((b) => ({ branch: b, semver: parse(b.replace(".x", ".0")) }))
    .sort((a, b) => compare(b.semver, a.semver))
    .map(({ branch }) => branch);
}

/**
 * Finds the latest release branch from the remote repository.
 *
 * Lists remote heads matching `N.N.x`, sorts by version, and returns
 * the highest.
 *
 * @returns The branch name (e.g. "5.10.x").
 */
export async function findLatestBranch(): Promise<string> {
  const output = await run("git", ["ls-remote", "--heads", REPO_URL]);
  const branches = parseHomebankReleaseBranches(output);
  if (branches.length === 0) {
    throw new Error("No release branches found");
  }
  return branches[0];
}

/**
 * Clones the HomeBank repository, or reuses an existing clone.
 *
 * On first call, shallow-clones the given branch. On subsequent calls,
 * detects the existing `.git` and fetches/checks out the branch instead.
 *
 * @param branch The branch to clone or checkout.
 * @param cloneDir Where to place the clone. Defaults to `$TMPDIR/homebank-vendor`.
 * @returns The repository root and `src/` directory paths.
 */
export async function cachedCloneHomebankRepo(
  branch: string,
  cloneDir = DEFAULT_CLONE_DIR,
): Promise<{ repoDir: string; srcDir: string }> {
  try {
    await Deno.stat(join(cloneDir, ".git"));
    console.log(`Reusing existing clone at ${cloneDir}`);
    await run("git", ["fetch", "--depth", "1", "origin", branch], {
      cwd: cloneDir,
    });
    await run("git", ["checkout", `origin/${branch}`], { cwd: cloneDir });
  } catch {
    console.log(`Cloning branch ${branch} from ${REPO_URL}...`);
    await Deno.mkdir(cloneDir, { recursive: true });
    await run("git", [
      "clone",
      "--depth",
      "1",
      "--branch",
      branch,
      REPO_URL,
      cloneDir,
    ]);
  }
  return { repoDir: cloneDir, srcDir: join(cloneDir, "src") };
}

/**
 * Copies HomeBank C source files into the vendor directory and writes
 * a manifest.
 *
 * Resolves the transitive `#include` tree starting from `homebank.h`,
 * copies each resolved header plus `hb-xml.c`, parses the version, and
 * writes `manifest.json`.
 *
 * @param sourcePath Directory containing the HomeBank C sources.
 * @param targetPath Destination vendor directory.
 */
async function vendorHomebankSources(
  sourcePath: string,
  targetPath: string,
): Promise<void> {
  const readSource = (name: string) =>
    Deno.readTextFileSync(join(sourcePath, name));

  const resolution = resolveIncludes("homebank.h", readSource);
  const version = parseVersion(readSource("homebank.h"));

  await Deno.mkdir(targetPath, { recursive: true });

  const filesToCopy = [...resolution.files, XML_SOURCE];
  await Promise.all(
    filesToCopy.map((file) =>
      Deno.copyFile(join(sourcePath, file), join(targetPath, file))
    ),
  );

  const manifest = buildManifest(version, resolution.includeTree);
  await Deno.writeTextFile(
    join(targetPath, "manifest.json"),
    JSON.stringify(manifest, null, 2) + "\n",
  );

  console.log(`Vendored HomeBank ${version} to ${targetPath}`);
  console.log(`  Headers: ${resolution.files.length}`);
  console.log(`  XML source: ${XML_SOURCE}`);
}

async function main(): Promise<void> {
  const scriptDir = dirname(fromFileUrl(import.meta.url));
  const vendorDir = join(scriptDir, "vendor", "homebank");

  const sourcePath = Deno.args[0];
  if (sourcePath) {
    await vendorHomebankSources(sourcePath, vendorDir);
    return;
  }

  const branch = await findLatestBranch();
  const { repoDir, srcDir } = await cachedCloneHomebankRepo(branch);
  const commit = await run("git", ["-C", repoDir, "rev-parse", "--short", "HEAD"]);

  await vendorHomebankSources(srcDir, vendorDir);

  const sourceInfo: SourceInfo = {
    repositoryUrl: REPO_URL,
    releaseBranch: branch,
    commitHash: commit,
    vendoredAt: new Date().toISOString(),
  };
  await Deno.writeTextFile(
    join(vendorDir, "source.json"),
    JSON.stringify(sourceInfo, null, 2) + "\n",
  );
  console.log(`  Source: ${branch} @ ${commit}`);
}

if (import.meta.main) {
  await main();
}
