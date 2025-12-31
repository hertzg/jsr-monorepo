/**
 * Dependency snapshot tests for all packages.
 *
 * This test iterates over all workspace packages and creates a snapshot
 * of their external dependencies in `_deps.snap` at each package root.
 * When dependencies in import_map.json are updated, the failing snapshots
 * indicate which packages are affected and should be included in the
 * conventional commit scope.
 *
 * The `_deps.snap` files are auto-generated and excluded from publishing.
 * They track external dependencies for detecting which packages are affected
 * when import_map.json is updated.
 *
 * To update snapshots after changing import_map.json:
 * ```sh
 * deno test --allow-all packages/deps.test.ts -- --update
 * ```
 *
 * @module
 */

import { assertSnapshot } from "@std/testing/snapshot";
import { join } from "@std/path";
import { getPackages } from "../_tools/utils.ts";

interface DenoInfoModule {
  specifier: string;
}

interface DenoInfoOutput {
  modules: DenoInfoModule[];
  npmPackages?: Record<string, { name: string; version: string }>;
}

/**
 * Runs `deno info --json` on a module and returns the parsed output.
 */
async function getDenoInfo(modulePath: string): Promise<DenoInfoOutput> {
  const command = new Deno.Command("deno", {
    args: ["info", "--json", modulePath],
    stdout: "piped",
    stderr: "piped",
  });

  const { stdout } = await command.output();
  return JSON.parse(new TextDecoder().decode(stdout));
}

const rootPath = join(import.meta.dirname!, "../");

Deno.test(`dependencies`, async (t) => {
  const pkgs = await getPackages();

  for (const pkg of pkgs) {
    await t.step(`${pkg.name}`, async (t) => {
      const exports = typeof pkg.exports == "string"
        ? { ".": pkg.exports }
        : pkg.exports;

      for (const [mod, path] of Object.entries(exports)) {
        await t.step(`${mod}`, async () => {
          const entryPath = join(rootPath, pkg.workspacePath, path);

          const info = await getDenoInfo(entryPath);
          const deps = info.modules
            .filter((module) => !module.specifier.startsWith("file://"))
            .map((
              module,
            ) => module.specifier);

          await assertSnapshot(t, deps, {
            path: join(rootPath, pkg.workspacePath, "_deps.snap"),
          });
        });
      }
    });
  }
});
