/**
 * Checks that the packages built by `_tools/build_npm.ts` work for a consumer.
 *
 * Every built package is packed with `bun pm pack`. Then, per package, a
 * throwaway consumer project outside the repository installs that tarball
 * twice, once with `bun` and once with `npm`, both against the default npm
 * registry. Workspace siblings are not on a registry during the check, so
 * the consumer points them at their own tarballs through `overrides`.
 *
 * For each package the check then:
 *
 * - imports every `exports` entry under `bun` (in the bun install),
 * - imports every `exports` entry under `node` (in the npm install),
 * - type-checks an import of every `exports` entry with `strict` and
 *   `skipLibCheck: false`.
 *
 * Usage: `bun _tools/verify_npm.ts [built package dir ...]` (default: all of `dist/`)
 */
import { $, Glob } from "bun";
import { mkdir, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { ROOT_DIR } from "./utils.ts";

const DIST_DIR = join(ROOT_DIR, "dist");
const CONCURRENT_CONSUMERS = 6;
const CHECK_NAMES = [
  "bun install",
  "bun import",
  "npm install",
  "node import",
  "typecheck",
] as const;

type CheckName = typeof CHECK_NAMES[number];

interface BuiltPackage {
  name: string;
  version: string;
  /** Specifiers a consumer can import, e.g. `@hertzg/ip/cidr`. */
  specifiers: string[];
  /** Absolute path of the packed tarball. */
  tarball: string;
}

interface CheckFailure {
  check: CheckName;
  output: string;
}

async function packPackage(
  dir: string,
  tarballDir: string,
): Promise<BuiltPackage> {
  const manifest = await Bun.file(join(dir, "package.json")).json() as {
    name: string;
    version: string;
    exports: Record<string, unknown>;
  };
  const packed = await $`bun pm pack --quiet --destination ${tarballDir}`
    .cwd(dir).text();
  return {
    name: manifest.name,
    version: manifest.version,
    specifiers: Object.keys(manifest.exports).map((subpath) =>
      join(manifest.name, subpath)
    ),
    tarball: resolve(tarballDir, packed.trim().split("\n").at(-1) ?? ""),
  };
}

/** Writes the consumer project: its manifest, an import script and a typed entry. */
async function writeConsumer(
  dir: string,
  pkg: BuiltPackage,
  packages: BuiltPackage[],
): Promise<void> {
  await mkdir(dir, { recursive: true });
  const overrides = Object.fromEntries(
    packages
      .filter((sibling) => sibling.name !== pkg.name)
      .map((sibling) => [sibling.name, `file:${sibling.tarball}`]),
  );
  await Bun.write(
    join(dir, "package.json"),
    JSON.stringify(
      {
        name: "consumer",
        private: true,
        type: "module",
        dependencies: { [pkg.name]: `file:${pkg.tarball}` },
        devDependencies: { "@types/node": "^24.0.0", typescript: "^5.9.0" },
        overrides,
      },
      null,
      2,
    ),
  );
  await Bun.write(
    join(dir, "imports.mjs"),
    pkg.specifiers
      .map((specifier) => `await import(${JSON.stringify(specifier)});`)
      .join("\n"),
  );
  await Bun.write(
    join(dir, "types.ts"),
    pkg.specifiers
      .map((specifier, index) =>
        `export * as entry${index} from ${JSON.stringify(specifier)};`
      )
      .join("\n"),
  );
  await Bun.write(
    join(dir, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        target: "esnext",
        lib: ["esnext"],
        module: "nodenext",
        strict: true,
        noEmit: true,
        skipLibCheck: false,
        types: ["node"],
      },
      files: ["types.ts"],
    }),
  );
}

/** Runs one check and returns its failure, or `undefined` when it passed. */
async function runCheck(
  check: CheckName,
  command: $.ShellPromise,
): Promise<CheckFailure | undefined> {
  const result = await command.nothrow().quiet();
  if (result.exitCode === 0) return undefined;
  const output = `${result.stdout}${result.stderr}`.trim();
  return { check, output: output.split("\n").slice(0, 12).join("\n") };
}

/**
 * Installs one package into fresh consumers and runs every check.
 * A failed install skips the checks that depend on it.
 */
async function verifyPackage(
  pkg: BuiltPackage,
  packages: BuiltPackage[],
  workDir: string,
): Promise<CheckFailure[]> {
  const slug = pkg.name.replace("/", "__");
  const bunDir = join(workDir, "consumers", slug, "bun");
  const npmDir = join(workDir, "consumers", slug, "npm");
  await writeConsumer(bunDir, pkg, packages);
  await writeConsumer(npmDir, pkg, packages);

  const failures: (CheckFailure | undefined)[] = [];
  const bunInstall = await runCheck("bun install", $`bun install`.cwd(bunDir));
  failures.push(bunInstall);
  if (!bunInstall) {
    failures.push(
      await runCheck("bun import", $`bun imports.mjs`.cwd(bunDir)),
    );
  }
  const npmInstall = await runCheck(
    "npm install",
    $`npm install --no-audit --no-fund`.cwd(npmDir),
  );
  failures.push(npmInstall);
  if (!npmInstall) {
    failures.push(
      await runCheck("node import", $`node imports.mjs`.cwd(npmDir)),
      await runCheck(
        "typecheck",
        $`node node_modules/typescript/bin/tsc -p .`.cwd(npmDir),
      ),
    );
  }
  return failures.filter((failure) => failure !== undefined);
}

async function listBuiltDirs(requestedDirs: string[]): Promise<string[]> {
  if (requestedDirs.length > 0) return requestedDirs.map((dir) => resolve(dir));
  const manifests = await Array.fromAsync(
    new Glob("@*/*/package.json").scan(DIST_DIR),
  );
  return manifests.sort().map((path) => join(DIST_DIR, path, ".."));
}

async function verifyPackages(requestedDirs: string[]): Promise<boolean> {
  const workDir = await mkdtemp(join(tmpdir(), "verify-npm-"));
  const tarballDir = join(workDir, "tarballs");
  await mkdir(tarballDir);

  // Every built package is packed, also when only some are verified: any of
  // them may be a sibling the verified ones depend on.
  const packages: BuiltPackage[] = [];
  for (const dir of await listBuiltDirs([])) {
    packages.push(await packPackage(dir, tarballDir));
  }
  const requested = new Set(
    await Promise.all(
      (await listBuiltDirs(requestedDirs)).map(async (dir) =>
        (await Bun.file(join(dir, "package.json")).json() as { name: string })
          .name
      ),
    ),
  );
  const pending = packages.filter((pkg) => requested.has(pkg.name));
  const total = pending.length;

  const failed = new Map<string, CheckFailure[]>();
  const worker = async () => {
    for (let pkg = pending.shift(); pkg; pkg = pending.shift()) {
      const failures = await verifyPackage(pkg, packages, workDir);
      if (failures.length > 0) failed.set(pkg.name, failures);
      console.log(`${failures.length > 0 ? "FAIL" : "ok  "} ${pkg.name}`);
    }
  };
  await Promise.all(Array.from({ length: CONCURRENT_CONSUMERS }, worker));

  for (const [name, failures] of failed) {
    for (const failure of failures) {
      console.error(`\n${name}: ${failure.check} failed\n${failure.output}`);
    }
  }
  console.log(
    `\n${total - failed.size} of ${total} packages pass (${
      CHECK_NAMES.join(", ")
    }); work dir: ${workDir}`,
  );
  return failed.size === 0;
}

process.exit(await verifyPackages(process.argv.slice(2)) ? 0 : 1);
