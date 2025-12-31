import denoJson from "../deno.json" with { type: "json" };
import { basename, join } from "@std/path";

export interface PackageInfo {
  name: string;
  version: string;
  exports: Record<string, string> | string;
  workspacePath: string;
  dirName: string;
}

export function getPackages(): Promise<PackageInfo[]> {
  return Promise.all(
    denoJson.workspace.map(async (workspacePath) => {
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
