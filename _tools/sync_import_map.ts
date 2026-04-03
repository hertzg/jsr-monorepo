import { getPackages } from "./utils.ts";

const importMapPath = new URL("../import_map.json", import.meta.url);
const importMap = JSON.parse(await Deno.readTextFile(importMapPath));

const packages = await getPackages();

let changed = false;
for (const pkg of packages) {
  const expected = `jsr:${pkg.name}@^${pkg.version}`;
  if (importMap.imports[pkg.name] !== expected) {
    console.log(`${pkg.name}: ${importMap.imports[pkg.name]} → ${expected}`);
    importMap.imports[pkg.name] = expected;
    changed = true;
  }
}

if (changed) {
  await Deno.writeTextFile(
    importMapPath,
    JSON.stringify(importMap, null, 2) + "\n",
  );
  console.log("sync_import_map: updated import_map.json");
} else {
  console.log("sync_import_map: already up to date");
}
