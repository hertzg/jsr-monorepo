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

const REPO_URL = "https://git.launchpad.net/homebank";

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
  /** The repository URL that was cloned. */
  repository: string;
  /** The branch that was cloned. */
  branch: string;
  /** Short commit hash at time of clone. */
  commit: string;
  /** ISO date string when vendoring was performed. */
  date: string;
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
  return {
    version,
    xmlSource: "hb-xml.c",
    includeTree,
  };
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
 * (ascending).
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
 * assertEquals(parseHomebankReleaseBranches(output), ["5.8.x", "5.9.x", "5.10.x"]);
 * ```
 */
export function parseHomebankReleaseBranches(
  lsRemoteOutput: string,
): string[] {
  const branches: string[] = [];
  for (const line of lsRemoteOutput.split("\n")) {
    const ref = line.split("\t")[1];
    if (!ref) continue;
    const name = ref.replace("refs/heads/", "");
    if (/^\d+\.\d+\.x$/.test(name)) {
      branches.push(name);
    }
  }
  branches.sort((a, b) => {
    const pa = a.replace(".x", "").split(".").map(Number);
    const pb = b.replace(".x", "").split(".").map(Number);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
      if (diff !== 0) return diff;
    }
    return 0;
  });
  return branches;
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
  return branches[branches.length - 1];
}

const CLONE_DIR = join(Deno.env.get("TMPDIR") ?? "/tmp", "homebank-vendor");

/**
 * Clones the HomeBank repository to a stable temp path.
 *
 * If the directory already exists, fetches the latest instead of
 * cloning from scratch. Returns the path to the `src/` directory.
 *
 * @param branch The branch to clone or checkout.
 * @returns The repository root and `src/` directory paths.
 */
async function cloneHomebankRepository(
  branch: string,
): Promise<{ repoDir: string; srcDir: string }> {
  try {
    await Deno.stat(join(CLONE_DIR, ".git"));
    console.log(`Reusing existing clone at ${CLONE_DIR}`);
    await run("git", ["fetch", "--depth", "1", "origin", branch], {
      cwd: CLONE_DIR,
    });
    await run("git", ["checkout", `origin/${branch}`], { cwd: CLONE_DIR });
  } catch {
    console.log(`Cloning branch ${branch} from ${REPO_URL}...`);
    await Deno.mkdir(CLONE_DIR, { recursive: true });
    await run("git", [
      "clone",
      "--depth",
      "1",
      "--branch",
      branch,
      REPO_URL,
      CLONE_DIR,
    ]);
  }
  return { repoDir: CLONE_DIR, srcDir: join(CLONE_DIR, "src") };
}

async function getSourceInfo(
  repoDir: string,
  branch: string,
): Promise<SourceInfo> {
  const commit = await run("git", [
    "-C",
    repoDir,
    "rev-parse",
    "--short",
    "HEAD",
  ]);
  return {
    repository: REPO_URL,
    branch,
    commit,
    date: new Date().toISOString().split("T")[0],
  };
}

async function vendorFromPath(
  sourcePath: string,
  vendorDir: string,
): Promise<void> {
  const resolution = resolveIncludes(
    "homebank.h",
    (name) => Deno.readTextFileSync(join(sourcePath, name)),
  );

  const homebankContent = Deno.readTextFileSync(
    join(sourcePath, "homebank.h"),
  );
  const version = parseVersion(homebankContent);

  await Deno.mkdir(vendorDir, { recursive: true });

  for (const file of resolution.files) {
    await Deno.copyFile(join(sourcePath, file), join(vendorDir, file));
  }
  await Deno.copyFile(
    join(sourcePath, "hb-xml.c"),
    join(vendorDir, "hb-xml.c"),
  );

  const manifest = buildManifest(version, resolution.includeTree);

  await Deno.writeTextFile(
    join(vendorDir, "manifest.json"),
    JSON.stringify(manifest, null, 2) + "\n",
  );

  console.log(`Vendored HomeBank ${version} to ${vendorDir}`);
  console.log(`  Headers: ${resolution.files.length}`);
  console.log(`  XML source: hb-xml.c`);
}

async function main(): Promise<void> {
  const scriptDir = dirname(fromFileUrl(import.meta.url));
  const vendorDir = join(scriptDir, "vendor", "homebank");

  const sourcePath = Deno.args[0];
  if (sourcePath) {
    await vendorFromPath(sourcePath, vendorDir);
    return;
  }

  const branch = await findLatestBranch();
  const { repoDir, srcDir } = await cloneHomebankRepository(branch);
  const sourceInfo = await getSourceInfo(repoDir, branch);
  await vendorFromPath(srcDir, vendorDir);
  await Deno.writeTextFile(
    join(vendorDir, "source.json"),
    JSON.stringify(sourceInfo, null, 2) + "\n",
  );
  console.log(`  Source: ${branch} @ ${sourceInfo.commit}`);
}

if (import.meta.main) {
  await main();
}
