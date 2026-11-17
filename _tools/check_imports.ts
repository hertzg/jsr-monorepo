/**
 * Checks that every package declares what it imports.
 *
 * - Shipped source (everything reachable from the package's `exports`) may
 *   import only what its own `dependencies` or `peerDependencies` list.
 * - Everything else in the package (tests, benchmarks) may also use the
 *   package's `devDependencies` and whatever the root `package.json` lists.
 * - A relative import must stay inside its package.
 * - Every entry in `dependencies` must be imported by shipped source.
 *
 * Usage: `bun _tools/check_imports.ts`
 */
import { Glob } from "bun";
import { dirname, join, relative, resolve } from "node:path";
import ts from "typescript";
import {
  getEntryPoints,
  getPackages,
  getRootPackage,
  type PackageInfo,
  ROOT_DIR,
} from "./utils.ts";

interface ImportSite {
  /** File path relative to the repository root. */
  file: string;
  line: number;
  specifier: string;
}

function isRelative(specifier: string): boolean {
  return specifier.startsWith("./") || specifier.startsWith("../");
}

function isSourceFile(file: string): boolean {
  return /\.[cm]?[jt]sx?$/.test(file);
}

/** Reads `@scope/name` out of `@scope/name/sub/path`, and `name` out of `name/sub`. */
function parsePackageName(specifier: string): string {
  const segments = specifier.split("/");
  return segments.slice(0, specifier.startsWith("@") ? 2 : 1).join("/");
}

async function listImports(file: string): Promise<ImportSite[]> {
  const source = await Bun.file(join(ROOT_DIR, file)).text();
  return ts.preProcessFile(source, true, true).importedFiles.map((ref) => ({
    file,
    line: source.slice(0, ref.pos).split("\n").length,
    specifier: ref.fileName,
  }));
}

async function listPackageFiles(pkg: PackageInfo): Promise<string[]> {
  const files: string[] = [];
  const glob = new Glob("**/*.{ts,tsx,mts,cts,js,mjs,cjs}");
  for await (const file of glob.scan(join(ROOT_DIR, pkg.workspacePath))) {
    if (/(^|\/)(node_modules|dist)\//.test(file)) continue;
    files.push(join(pkg.workspacePath, file));
  }
  return files.sort();
}

/** Follows relative imports from the entry points to find the files that ship. */
function listShippedFiles(
  pkg: PackageInfo,
  importsByFile: Map<string, ImportSite[]>,
): Set<string> {
  const shipped = new Set<string>();
  const queue = getEntryPoints(pkg).filter(isSourceFile);
  for (let file = queue.pop(); file !== undefined; file = queue.pop()) {
    if (shipped.has(file)) continue;
    shipped.add(file);
    for (const site of importsByFile.get(file) ?? []) {
      if (!isRelative(site.specifier)) continue;
      const target = relative(
        ROOT_DIR,
        resolve(ROOT_DIR, dirname(file), site.specifier),
      );
      if (importsByFile.has(target)) queue.push(target);
    }
  }
  return shipped;
}

function describeSite(site: ImportSite): string {
  return `${site.file}:${site.line}: "${site.specifier}"`;
}

async function checkPackage(
  pkg: PackageInfo,
  root: PackageInfo,
): Promise<string[]> {
  const importsByFile = new Map<string, ImportSite[]>();
  for (const file of await listPackageFiles(pkg)) {
    importsByFile.set(file, await listImports(file));
  }
  const shipped = listShippedFiles(pkg, importsByFile);

  const shippedAllowed = new Set([
    pkg.name,
    ...Object.keys(pkg.dependencies),
    ...Object.keys(pkg.peerDependencies),
  ]);
  const otherAllowed = new Set([
    ...shippedAllowed,
    ...Object.keys(pkg.devDependencies),
    ...Object.keys(root.dependencies),
    ...Object.keys(root.devDependencies),
  ]);

  const problems: string[] = [];
  const usedByShipped = new Set<string>();
  for (const [file, sites] of importsByFile) {
    const isShipped = shipped.has(file);
    for (const site of sites) {
      const { specifier } = site;
      if (isRelative(specifier)) {
        const target = resolve(ROOT_DIR, dirname(file), specifier);
        const packageDir = resolve(ROOT_DIR, pkg.workspacePath);
        if (relative(packageDir, target).startsWith("..")) {
          problems.push(
            `${describeSite(site)} leaves the package; import it by name`,
          );
        }
      } else if (specifier.startsWith("node:")) {
        continue;
      } else if (specifier.startsWith("bun:")) {
        if (isShipped) {
          problems.push(
            `${describeSite(site)} ties shipped source to the Bun runtime`,
          );
        }
      } else if (/^[a-z]+:/.test(specifier)) {
        problems.push(
          `${describeSite(site)} is not a package name; declare the ` +
            `dependency in package.json and import it bare`,
        );
      } else {
        const name = parsePackageName(specifier);
        if (isShipped) usedByShipped.add(name);
        if (isShipped && !shippedAllowed.has(name)) {
          problems.push(
            `${describeSite(site)} ships, but ${name} is not in ` +
              `"dependencies" of ${pkg.workspacePath}/package.json`,
          );
        } else if (!otherAllowed.has(name)) {
          problems.push(
            `${describeSite(site)}: ${name} is in neither ` +
              `${pkg.workspacePath}/package.json nor the root "devDependencies"`,
          );
        }
      }
    }
  }

  for (const name of Object.keys(pkg.dependencies)) {
    if (!usedByShipped.has(name)) {
      problems.push(
        `${pkg.workspacePath}/package.json: "dependencies" lists ${name}, ` +
          `which no shipped file imports`,
      );
    }
  }
  return problems;
}

async function main(): Promise<void> {
  const root = await getRootPackage();
  const problems: string[] = [];
  for (const pkg of await getPackages()) {
    problems.push(...await checkPackage(pkg, root));
  }
  for (const problem of problems) console.warn(`check_imports: ${problem}`);
  if (problems.length > 0) process.exit(1);
  console.log("check_imports: ok");
}

await main();
