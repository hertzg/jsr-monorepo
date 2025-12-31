import { getPackageNames, getPackages } from "./utils.ts";

const readme = await Deno.readTextFile("README.md");

const packages = await getPackages();

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

for (const pkg of packages) {
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
const packageNames = getPackageNames(packages);
for (const pkgName of readmePackages.keys()) {
  if (!packageNames.has(pkgName)) {
    console.warn(
      `check_readme: Extra entry "${pkgName}" does not match any workspace`,
    );
  }
}

if (failed) {
  Deno.exit(1);
}

console.log("check_readme: ok");
