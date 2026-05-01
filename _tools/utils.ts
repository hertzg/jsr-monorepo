import denoJson from "../deno.json" with { type: "json" };
import { basename, join } from "@std/path";

export interface PackageInfo {
  name: string;
  version: string;
  exports: Record<string, string> | string;
  workspacePath: string;
  dirName: string;
}

/**
 * Expands the `workspace` entries from deno.json. Entries ending in `/*` are
 * treated as glob patterns and expanded to one path per matching subdirectory;
 * other entries are passed through verbatim.
 */
async function expandWorkspacePaths(): Promise<string[]> {
  const out: string[] = [];
  for (const entry of denoJson.workspace) {
    if (entry.endsWith("/*")) {
      const parent = entry.slice(0, -2);
      for await (const dirent of Deno.readDir(parent)) {
        if (dirent.isDirectory) {
          out.push(`${parent}/${dirent.name}`);
        }
      }
    } else {
      out.push(entry);
    }
  }
  out.sort();
  return out;
}

export async function getWorkspacePaths(): Promise<string[]> {
  return await expandWorkspacePaths();
}

export async function getPackages(): Promise<PackageInfo[]> {
  const paths = await expandWorkspacePaths();
  return Promise.all(
    paths.map(async (workspacePath) => {
      const pkgJson = JSON.parse(
        await Deno.readTextFile(join(workspacePath, "deno.json")),
      );
      return {
        name: pkgJson.name,
        version: pkgJson.version,
        exports: pkgJson.exports,
        workspacePath,
        dirName: basename(workspacePath),
      };
    }),
  );
}

export function getPackageNames(packages: PackageInfo[]): Set<string> {
  return new Set(packages.map((p) => p.name));
}
