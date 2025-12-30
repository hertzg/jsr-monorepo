import denoJson from "../deno.json" with { type: "json" };
import { parse as parseYaml } from "@std/yaml";
import { basename, join } from "@std/path";

type LabelerRule = { "changed-files"?: { "any-glob-to-any-file": string }[] }[];
type Labeler = Record<string, LabelerRule>;

const labeler = parseYaml(
  await Deno.readTextFile(".github/labeler.yml"),
) as Labeler;

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

let failed = false;

for (const pkg of await workspaceJsonList) {
  const label = labeler[pkg.name];
  const expectedGlob = `packages/${pkg.dirName}/**`;

  if (!label) {
    console.warn(`check_labeler: No label found for ${pkg.name}`);
    failed = true;
    continue;
  }

  const globs = label
    .flatMap((rule) => rule["changed-files"] ?? [])
    .map((cf) => cf["any-glob-to-any-file"]);

  if (!globs.includes(expectedGlob)) {
    console.warn(
      `check_labeler: Invalid glob for ${pkg.name}: ${globs.join(", ")}`,
    );
    console.warn(`check_labeler: Expected: ${expectedGlob}`);
    failed = true;
  }
}

// Warn about extra labels (does not cause failure)
const workspaceNames = new Set((await workspaceJsonList).map((p) => p.name));
for (const label of Object.keys(labeler)) {
  if (!workspaceNames.has(label)) {
    console.warn(
      `check_labeler: Extra label "${label}" does not match any workspace`,
    );
  }
}

if (failed) {
  Deno.exit(1);
}

console.log("check_labeler: ok");
