import { Glob } from "bun";
import { basename, dirname, join, resolve } from "node:path";

/** Absolute path of the repository root. */
export const ROOT_DIR = resolve(import.meta.dirname, "..");

/** `exports` as package.json allows it: a path, or a map that may nest conditions. */
export type PackageExports = string | { [key: string]: PackageExports };

export interface PackageInfo {
  name: string;
  version: string;
  exports: PackageExports;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  peerDependencies: Record<string, string>;
  /** Package directory relative to the repository root, e.g. `packages/@hertzg/ip`. */
  workspacePath: string;
  dirName: string;
}

interface PackageJson {
  name: string;
  version: string;
  exports?: PackageExports;
  workspaces?: string[];
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

async function readPackageJson(path: string): Promise<PackageJson> {
  return await Bun.file(path).json() as PackageJson;
}

function toPackageInfo(json: PackageJson, workspacePath: string): PackageInfo {
  return {
    name: json.name,
    version: json.version,
    exports: json.exports ?? {},
    dependencies: json.dependencies ?? {},
    devDependencies: json.devDependencies ?? {},
    peerDependencies: json.peerDependencies ?? {},
    workspacePath,
    dirName: basename(workspacePath),
  };
}

/** Reads the root `package.json`, the workspace root every package belongs to. */
export async function getRootPackage(): Promise<PackageInfo> {
  return toPackageInfo(
    await readPackageJson(join(ROOT_DIR, "package.json")),
    ".",
  );
}

/**
 * Lists every workspace package, sorted by path. The set is whatever the
 * `workspaces` globs of the root `package.json` match, and all metadata comes
 * from each package's own `package.json`.
 */
export async function getPackages(): Promise<PackageInfo[]> {
  const root = await readPackageJson(join(ROOT_DIR, "package.json"));
  const manifestPaths: string[] = [];
  for (const workspace of root.workspaces ?? []) {
    const glob = new Glob(`${workspace}/package.json`);
    manifestPaths.push(...await Array.fromAsync(glob.scan(ROOT_DIR)));
  }
  return await Promise.all(
    manifestPaths.sort().map(async (manifestPath) =>
      toPackageInfo(
        await readPackageJson(join(ROOT_DIR, manifestPath)),
        dirname(manifestPath),
      )
    ),
  );
}

export function getPackageNames(packages: PackageInfo[]): Set<string> {
  return new Set(packages.map((p) => p.name));
}

function flattenExports(exports: PackageExports): string[] {
  return typeof exports === "string"
    ? [exports]
    : Object.values(exports).flatMap(flattenExports);
}

/** Lists the files a package exports, relative to the repository root. */
export function getEntryPoints(pkg: PackageInfo): string[] {
  const files = flattenExports(pkg.exports).map((file) =>
    join(pkg.workspacePath, file)
  );
  return [...new Set(files)];
}
