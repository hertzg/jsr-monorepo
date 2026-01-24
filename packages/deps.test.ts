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
import { join, toFileUrl } from "@std/path";
import { getPackages } from "../_tools/utils.ts";

interface DenoInfoDependency {
  specifier: string;
  code?: { specifier: string };
  type?: { specifier: string };
}

interface DenoInfoModule {
  specifier: string;
  dependencies?: DenoInfoDependency[];
}

interface DenoInfoOutput {
  roots: string[];
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

      const workspacePath = join(rootPath, pkg.workspacePath);
      const workspacePathUrl = toFileUrl(workspacePath);
      for (const [mod, path] of Object.entries(exports)) {
        await t.step(`${mod}`, async () => {
          const entrypointPath = join(workspacePath, path);

          const info = await getDenoInfo(entrypointPath);
          const workspaceModules = info.modules.filter((m) =>
            m.specifier.startsWith(workspacePathUrl.href)
          );

          const deps = workspaceModules
            .filter((m) => m.specifier.startsWith(`file://${rootPath}`))
            .flatMap((m) => m.dependencies ?? [])
            .map((d) => ({
              source: d.specifier,
              resolved: d.code?.specifier ?? d.type?.specifier ?? d.specifier,
            }))
            .filter(({ source, resolved }) => {
              if (source.startsWith(".")) return false;
              if (resolved.startsWith(workspacePathUrl.href)) return false;
              return true;
            })
            .map(({ source, resolved }) => {
              // Workspace members: use original alias, not file:// path
              if (resolved.startsWith("file://")) {
                return source; // e.g., "@hertzg/binstruct"
              }
              // External deps: use resolved (keeps semver range)
              return resolved; // e.g., "jsr:@std/cli@^1.0.25"
            });

          await assertSnapshot(t, Array.from(new Set(deps)), {
            path: join(rootPath, pkg.workspacePath, "_deps.snap"),
          });
        });
      }
    });
  }
});
