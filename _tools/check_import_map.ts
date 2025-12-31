import importMap from "../import_map.json" with { type: "json" };
import { getPackages } from "./utils.ts";

// deno-lint-ignore no-explicit-any
const imports = importMap.imports as any;
const packages = await getPackages();

let failed = false;

for (const pkg of packages) {
  const dependency = imports[pkg.name];

  if (!dependency) {
    console.warn(
      `check_import_map: No import map entry found for ${pkg.name}`,
    );
    failed = true;
    continue;
  }
  const correctDependency = `jsr:${pkg.name}@^${pkg.version}`;
  if (dependency !== correctDependency) {
    console.warn(
      `check_import_map: Invalid import map entry for ${pkg.name}: ${dependency}`,
    );
    console.warn(
      `check_import_map: Expected: ${correctDependency}`,
    );
    failed = true;
  }
}

if (failed) {
  Deno.exit(1);
}

console.log("check_import_map: ok");
