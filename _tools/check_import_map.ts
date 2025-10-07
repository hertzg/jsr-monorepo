import denoJson from "../deno.json" with { type: "json" };
import importMap from "../import_map.json" with { type: "json" };
import { join } from "@std/path";

// deno-lint-ignore no-explicit-any
const imports = importMap.imports as any;
const denoJsonList = Promise.all(
  denoJson.workspace.map((w) =>
    Deno.readTextFile(join(w, "deno.json")).then(JSON.parse)
  ),
);

let failed = false;

for (const denoJson of await denoJsonList) {
  const dependency = imports[denoJson.name];

  if (!dependency) {
    console.warn(
      `check_import_map: No import map entry found for ${denoJson.name}`,
    );
    failed = true;
    continue;
  }
  const correctDependency = `jsr:${denoJson.name}@^${denoJson.version}`;
  if (dependency !== correctDependency) {
    console.warn(
      `check_import_map: Invalid import map entry for ${denoJson.name}: ${dependency}`,
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
