import denoJson from "../deno.json" with { type: "json" };
import { basename, join } from "@std/path";

const readme = await Deno.readTextFile("README.md");

const workspaceJsonList = Promise.all(
  denoJson.workspace.map((w) =>
    Deno.readTextFile(join(w, "deno.json")).then(JSON.parse).then((
      json: { name: string },
    ) => ({
      name: json.name,
      dirName: basename(w),
    }))
  ),
);

// Extract package names from README table rows
// Format: | [@scope/name](https://jsr.io/@scope/name) | ...
const tableRowPattern =
  /\|\s*\[(@[^\]]+)\]\(https:\/\/jsr\.io\/[^)]+\)\s*\|\s*\[!\[JSR\]\(https:\/\/jsr\.io\/badges\/([^)]+)\)\]\(https:\/\/jsr\.io\/[^)]+\)\s*\|/g;

const readmePackages = new Map<
  string,
  { linkName: string; badgeName: string }
>();
for (const match of readme.matchAll(tableRowPattern)) {
  readmePackages.set(match[1], { linkName: match[1], badgeName: match[2] });
}

let failed = false;

for (const pkg of await workspaceJsonList) {
  const entry = readmePackages.get(pkg.name);

  if (!entry) {
    console.warn(`check_readme: No README entry found for ${pkg.name}`);
    console.warn(
      `check_readme: Expected row: | [${pkg.name}](https://jsr.io/${pkg.name}) | [![JSR](https://jsr.io/badges/${pkg.name})](https://jsr.io/${pkg.name}) |`,
    );
    failed = true;
    continue;
  }

  if (entry.badgeName !== pkg.name) {
    console.warn(
      `check_readme: Badge name mismatch for ${pkg.name}: got "${entry.badgeName}"`,
    );
    failed = true;
  }
}

// Warn about extra entries (does not cause failure)
const workspaceNames = new Set((await workspaceJsonList).map((p) => p.name));
for (const pkgName of readmePackages.keys()) {
  if (!workspaceNames.has(pkgName)) {
    console.warn(
      `check_readme: Extra entry "${pkgName}" does not match any workspace`,
    );
  }
}

if (failed) {
  Deno.exit(1);
}

console.log("check_readme: ok");
