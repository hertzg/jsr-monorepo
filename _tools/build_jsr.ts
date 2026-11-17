/**
 * Writes a `jsr.json` beside every package's `package.json`, so that
 * `bun x jsr publish` can publish the TypeScript source to JSR.
 *
 * `package.json` is the only file a person edits. `jsr.json` is derived from
 * it and ignored by git:
 *
 * - `name`, `version` and `exports` are copied.
 * - `license` is left out on purpose: with no license field the publish
 *   ships the repository's `LICENSE` file in every package, and with one it
 *   ships none.
 * - `files` becomes `publish.include` / `publish.exclude`.
 * - `dependencies` becomes `imports`. Without it the publish would rewrite
 *   `@std/bytes` to `npm:@jsr/std__bytes`, which no JSR consumer can resolve.
 *   Workspace siblings are left out: the publish resolves those itself.
 *
 * Usage: `bun _tools/build_jsr.ts`
 */
import { join } from "node:path";
import { getPackages, ROOT_DIR } from "./utils.ts";

interface PackageManifest {
  name: string;
  version: string;
  exports: unknown;
  files?: string[];
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

interface JsrConfig {
  name: string;
  version: string;
  exports: unknown;
  imports?: Record<string, string>;
  publish: { include: string[]; exclude: string[] };
}

/**
 * Turns a `package.json` dependency range into the specifier JSR consumers
 * import, or `undefined` for a workspace sibling.
 *
 * `npm:@jsr/std__bytes@^1.0.6` is how npm clients spell a JSR package, so it
 * maps back to `jsr:@std/bytes@^1.0.6`. A plain range is an npm package.
 */
function toJsrSpecifier(name: string, range: string): string | undefined {
  if (range.startsWith("workspace:")) return undefined;
  const jsrAlias = range.match(/^npm:@jsr\/([^_]+)__([^@]+)@(.+)$/);
  if (jsrAlias) return `jsr:@${jsrAlias[1]}/${jsrAlias[2]}@${jsrAlias[3]}`;
  const npmAlias = range.match(/^npm:(.+)$/);
  return npmAlias ? `npm:${npmAlias[1]}` : `npm:${name}@${range}`;
}

function toJsrImports(
  dependencies: Record<string, string>,
): Record<string, string> {
  const imports: Record<string, string> = {};
  for (const [name, range] of Object.entries(dependencies)) {
    const specifier = toJsrSpecifier(name, range);
    if (specifier) imports[name] = specifier;
  }
  return imports;
}

function toJsrConfig(manifest: PackageManifest): JsrConfig {
  const files = manifest.files ?? [];
  const imports = toJsrImports({
    ...manifest.peerDependencies,
    ...manifest.dependencies,
  });
  return {
    name: manifest.name,
    version: manifest.version,
    exports: manifest.exports,
    ...(Object.keys(imports).length > 0 ? { imports } : {}),
    publish: {
      include: files.filter((entry) => !entry.startsWith("!")),
      exclude: files
        .filter((entry) => entry.startsWith("!"))
        .map((entry) => entry.slice(1)),
    },
  };
}

for (const pkg of await getPackages()) {
  const dir = join(ROOT_DIR, pkg.workspacePath);
  const manifest = await Bun.file(join(dir, "package.json"))
    .json() as PackageManifest;
  if (!manifest.files) {
    throw new Error(`${pkg.name}: package.json has no "files" list`);
  }
  await Bun.write(
    join(dir, "jsr.json"),
    JSON.stringify(toJsrConfig(manifest), null, 2) + "\n",
  );
}
