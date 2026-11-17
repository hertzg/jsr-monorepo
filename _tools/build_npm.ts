/**
 * Builds packages into `dist/<scope>/<name>/`, each one ready for
 * `bun pm pack` and `npm publish`.
 *
 * A built package holds the emitted `.js` and `.d.ts` of its shipped sources,
 * a publish-ready `package.json`, the `LICENSE`, and a `node_modules/` with
 * its bundled dependencies.
 *
 * - One compiler program for every package, not one per package. Siblings
 *   import each other's `.ts` source through the workspace links, so a
 *   program per package would check every dependency again in each run. One
 *   program checks each file once, and only the shipped files are emitted.
 * - The shipped files come from the `files` list in each `package.json`.
 *   `_tools/build_jsr.ts` reads the same list, so npm and JSR ship the same
 *   modules.
 * - A dependency written as `npm:@jsr/...` is bundled into the tarball rather
 *   than declared. Those live on npm.jsr.io, which a consumer installing from
 *   the npm registry cannot reach.
 *
 * Usage: `bun _tools/build_npm.ts [package dir ...]` (default: every package)
 */
import { Glob } from "bun";
import { cp, mkdir, realpath, rm } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import ts from "typescript";
import { getPackages, ROOT_DIR } from "./utils.ts";

const DIST_DIR = join(ROOT_DIR, "dist");
const PACKAGES_DIR = join(ROOT_DIR, "packages");

type ExportsField = string | { [key: string]: ExportsField };

interface PackageManifest {
  name: string;
  version: string;
  description?: string;
  license?: string;
  repository?: unknown;
  homepage?: string;
  bugs?: unknown;
  keywords?: string[];
  type?: string;
  exports: ExportsField;
  bin?: string | Record<string, string>;
  files?: string[];
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

interface SourcePackage {
  /** Absolute path of the package directory. */
  dir: string;
  manifest: PackageManifest;
  /** Shipped `.ts` and `.d.ts` files, relative to `dir`. */
  files: string[];
}

interface BundledDependency {
  /** Directory name under `node_modules/`, e.g. `@std/xml`. */
  installName: string;
  /** Absolute path of the installed copy to bundle. */
  sourceDir: string;
  version: string;
}

async function readManifest(dir: string): Promise<PackageManifest> {
  return await Bun.file(join(dir, "package.json")).json() as PackageManifest;
}

/** Lists the `.ts` files a package ships, as its `files` list describes. */
async function listShippedFiles(
  dir: string,
  manifest: PackageManifest,
): Promise<string[]> {
  if (!manifest.files) {
    throw new Error(`${manifest.name}: package.json has no "files" list`);
  }
  const excluded = manifest.files
    .filter((entry) => entry.startsWith("!"))
    .map((entry) => new Glob(entry.slice(1)));
  const shipped = new Set<string>();
  for (const entry of manifest.files) {
    if (entry.startsWith("!")) continue;
    for await (const file of new Glob(entry).scan(dir)) {
      if (file.split("/").includes("node_modules")) continue;
      if (!file.endsWith(".ts")) continue;
      if (excluded.some((glob) => glob.match(file))) continue;
      shipped.add(file);
    }
  }
  return [...shipped].sort();
}

async function readSourcePackage(dir: string): Promise<SourcePackage> {
  const manifest = await readManifest(dir);
  return { dir, manifest, files: await listShippedFiles(dir, manifest) };
}

/**
 * Reads the root `tsconfig.json` and switches it from checking to emitting.
 * The checking rules stay whatever the repository uses.
 */
function readCompilerOptions(): ts.CompilerOptions {
  const configPath = join(ROOT_DIR, "tsconfig.json");
  const { config, error } = ts.readConfigFile(configPath, ts.sys.readFile);
  if (error) throw new Error(formatDiagnostic(error));
  const parsed = ts.parseJsonConfigFileContent(config, ts.sys, ROOT_DIR);
  return {
    ...parsed.options,
    noEmit: false,
    declaration: true,
    sourceMap: false,
    rewriteRelativeImportExtensions: true,
    target: ts.ScriptTarget.ES2022,
    rootDir: PACKAGES_DIR,
    outDir: DIST_DIR,
  };
}

function formatDiagnostic(diagnostic: ts.Diagnostic): string {
  return ts.formatDiagnostic(diagnostic, {
    getCanonicalFileName: (fileName) => fileName,
    getCurrentDirectory: () => ROOT_DIR,
    getNewLine: () => "\n",
  }).trimEnd();
}

function findOwner(
  packages: SourcePackage[],
  fileName: string,
): SourcePackage | undefined {
  return packages.find((pkg) => fileName.startsWith(pkg.dir + "/"));
}

function isRelativeTsSpecifier(node: ts.Node): node is ts.StringLiteral {
  return ts.isStringLiteral(node) && /^\.\.?\/.*\.ts$/.test(node.text);
}

/**
 * Rewrites `./x.ts` to `./x.js` in emitted declaration files.
 *
 * `rewriteRelativeImportExtensions` does this for `.js` output only, which
 * would leave every `.d.ts` pointing at source files the tarball does not
 * contain.
 */
function rewriteDeclarationSpecifiers(
  context: ts.TransformationContext,
): ts.Transformer<ts.SourceFile | ts.Bundle> {
  const { factory } = context;
  const toJsSpecifier = (specifier: ts.StringLiteral) =>
    factory.createStringLiteral(specifier.text.replace(/\.ts$/, ".js"));
  const visit = (node: ts.Node): ts.Node => {
    if (
      ts.isImportDeclaration(node) &&
      isRelativeTsSpecifier(node.moduleSpecifier)
    ) {
      return factory.updateImportDeclaration(
        node,
        node.modifiers,
        node.importClause,
        toJsSpecifier(node.moduleSpecifier),
        node.attributes,
      );
    }
    if (
      ts.isExportDeclaration(node) && node.moduleSpecifier &&
      isRelativeTsSpecifier(node.moduleSpecifier)
    ) {
      return factory.updateExportDeclaration(
        node,
        node.modifiers,
        node.isTypeOnly,
        node.exportClause,
        toJsSpecifier(node.moduleSpecifier),
        node.attributes,
      );
    }
    if (
      ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument) &&
      isRelativeTsSpecifier(node.argument.literal)
    ) {
      return factory.updateImportTypeNode(
        node,
        factory.createLiteralTypeNode(toJsSpecifier(node.argument.literal)),
        node.attributes,
        node.qualifier,
        ts.visitNodes(node.typeArguments, visit, ts.isTypeNode),
        node.isTypeOf,
      );
    }
    return ts.visitEachChild(node, visit, context);
  };
  return (root) =>
    ts.isSourceFile(root) ? ts.visitEachChild(root, visit, context) : root;
}

/**
 * Type-checks and emits the shipped files of `packages`.
 *
 * @returns Diagnostics grouped by the name of the package whose file raised
 * them. A package missing from the map compiled cleanly.
 */
function emitPackages(packages: SourcePackage[]): Map<string, string[]> {
  const rootNames = packages.flatMap((pkg) =>
    pkg.files.map((file) => join(pkg.dir, file))
  );
  const program = ts.createProgram({
    rootNames,
    options: readCompilerOptions(),
  });
  const failures = new Map<string, string[]>();
  const recordFailure = (diagnostic: ts.Diagnostic) => {
    const owner = diagnostic.file
      ? findOwner(packages, diagnostic.file.fileName)
      : undefined;
    const key = owner?.manifest.name ?? "(outside the built packages)";
    failures.set(key, [
      ...failures.get(key) ?? [],
      formatDiagnostic(diagnostic),
    ]);
  };
  ts.getPreEmitDiagnostics(program).forEach(recordFailure);
  for (const rootName of rootNames) {
    // A hand-written declaration file has nothing to emit. It is copied.
    if (rootName.endsWith(".d.ts")) continue;
    const sourceFile = program.getSourceFile(rootName);
    if (!sourceFile) throw new Error(`not part of the program: ${rootName}`);
    program.emit(sourceFile, undefined, undefined, false, {
      afterDeclarations: [rewriteDeclarationSpecifiers],
    }).diagnostics.forEach(recordFailure);
  }
  return failures;
}

/** Rewrites every `./x.ts` leaf of `exports` to its built `.d.ts` and `.js`. */
function toBuiltExports(exports: ExportsField): ExportsField {
  if (typeof exports === "string") {
    return {
      types: exports.replace(/\.ts$/, ".d.ts"),
      default: exports.replace(/\.ts$/, ".js"),
    };
  }
  return Object.fromEntries(
    Object.entries(exports).map((
      [key, value],
    ) => [key, toBuiltExports(value)]),
  );
}

function toBuiltBin(
  bin: string | Record<string, string>,
): string | Record<string, string> {
  if (typeof bin === "string") return bin.replace(/\.ts$/, ".js");
  return Object.fromEntries(
    Object.entries(bin).map((
      [name, path],
    ) => [name, path.replace(/\.ts$/, ".js")]),
  );
}

/** Turns `workspace:^` into `^1.2.3`, the range a registry consumer needs. */
function resolveWorkspaceRange(range: string, version: string): string {
  const prefix = range.slice("workspace:".length);
  if (prefix === "*" || prefix === "") return version;
  if (prefix === "^" || prefix === "~") return prefix + version;
  return prefix;
}

/** Finds where `name` is installed for code living in `fromDir`. */
async function findInstalledDir(
  name: string,
  fromDir: string,
): Promise<string> {
  for (let dir = fromDir;; dir = dirname(dir)) {
    const candidate = join(dir, "node_modules", name);
    if (await Bun.file(join(candidate, "package.json")).exists()) {
      return await realpath(candidate);
    }
    if (dir === dirname(dir)) {
      throw new Error(`${name} is not installed (looked up from ${fromDir})`);
    }
  }
}

/**
 * Collects `names` and everything they depend on, as installed for `pkgDir`.
 *
 * A bundled package keeps the name its importer uses (`@std/path`), and its
 * own dependencies keep theirs (`@jsr/std__internal`), so both resolve from
 * the single flat `node_modules/` inside the tarball.
 */
async function collectBundledDependencies(
  names: string[],
  pkgDir: string,
): Promise<BundledDependency[]> {
  const bundled = new Map<string, BundledDependency>();
  const queue = names.map((installName) => ({ installName, fromDir: pkgDir }));
  for (let next = queue.shift(); next; next = queue.shift()) {
    const sourceDir = await findInstalledDir(next.installName, next.fromDir);
    const manifest = await readManifest(sourceDir);
    const existing = bundled.get(next.installName);
    if (existing) {
      if (existing.version === manifest.version) continue;
      throw new Error(
        `${next.installName} would be bundled twice: ${existing.version} and ${manifest.version}`,
      );
    }
    bundled.set(next.installName, {
      installName: next.installName,
      sourceDir,
      version: manifest.version,
    });
    for (const installName of Object.keys(manifest.dependencies ?? {})) {
      queue.push({ installName, fromDir: sourceDir });
    }
  }
  return [...bundled.values()];
}

/**
 * Writes everything the compiler does not emit into the output:
 * `package.json`, `LICENSE`, hand-written `.d.ts` files and bundled
 * dependencies.
 */
async function writePackageFiles(
  pkg: SourcePackage,
  siblingVersions: Map<string, string>,
): Promise<void> {
  const outDir = join(DIST_DIR, relative(PACKAGES_DIR, pkg.dir));
  const dependencies: Record<string, string> = {};
  const bundledNames: string[] = [];
  for (
    const [name, range] of Object.entries(pkg.manifest.dependencies ?? {})
  ) {
    if (range.startsWith("npm:@jsr/")) {
      bundledNames.push(name);
    } else if (range.startsWith("workspace:")) {
      const version = siblingVersions.get(name);
      if (!version) throw new Error(`${name} is not a workspace package`);
      dependencies[name] = resolveWorkspaceRange(range, version);
    } else {
      dependencies[name] = range;
    }
  }
  const bundled = await collectBundledDependencies(bundledNames, pkg.dir);
  for (const dependency of bundled) {
    await cp(
      dependency.sourceDir,
      join(outDir, "node_modules", dependency.installName),
      { recursive: true, dereference: true },
    );
  }

  for (const file of pkg.files.filter((file) => file.endsWith(".d.ts"))) {
    await Bun.write(join(outDir, file), Bun.file(join(pkg.dir, file)));
  }

  const { manifest } = pkg;
  const built = {
    name: manifest.name,
    version: manifest.version,
    description: manifest.description,
    license: manifest.license,
    repository: manifest.repository,
    homepage: manifest.homepage,
    bugs: manifest.bugs,
    keywords: manifest.keywords,
    type: manifest.type,
    exports: toBuiltExports(manifest.exports),
    bin: manifest.bin ? toBuiltBin(manifest.bin) : undefined,
    dependencies,
    peerDependencies: manifest.peerDependencies,
    bundleDependencies: bundled.length > 0
      ? bundled.map((dependency) => dependency.installName).sort()
      : undefined,
  };
  await Bun.write(
    join(outDir, "package.json"),
    JSON.stringify(built, null, 2) + "\n",
  );

  const ownLicense = Bun.file(join(pkg.dir, "LICENSE"));
  const license = await ownLicense.exists()
    ? ownLicense
    : Bun.file(join(ROOT_DIR, "LICENSE"));
  await Bun.write(join(outDir, "LICENSE"), license);
}

async function buildPackages(requestedDirs: string[]): Promise<boolean> {
  const workspace = await getPackages();
  const siblingVersions = new Map(
    workspace.map((pkg) => [pkg.name, pkg.version]),
  );
  const dirs = requestedDirs.length > 0
    ? requestedDirs.map((dir) => resolve(dir))
    : workspace.map((pkg) => join(ROOT_DIR, pkg.workspacePath));
  const packages = await Promise.all(dirs.map(readSourcePackage));

  for (const pkg of packages) {
    const outDir = join(DIST_DIR, relative(PACKAGES_DIR, pkg.dir));
    await rm(outDir, { recursive: true, force: true });
    await mkdir(outDir, { recursive: true });
  }

  const failures = emitPackages(packages);
  for (const pkg of packages) {
    try {
      await writePackageFiles(pkg, siblingVersions);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const name = pkg.manifest.name;
      failures.set(name, [...failures.get(name) ?? [], message]);
    }
  }

  for (const [name, messages] of failures) {
    console.error(`FAIL ${name}\n  ${messages.join("\n  ")}`);
  }
  const failed = packages.filter((pkg) => failures.has(pkg.manifest.name));
  console.log(
    `built ${
      packages.length - failed.length
    } of ${packages.length} packages into ${relative(ROOT_DIR, DIST_DIR)}/`,
  );
  return failures.size === 0;
}

process.exit(await buildPackages(process.argv.slice(2)) ? 0 : 1);
