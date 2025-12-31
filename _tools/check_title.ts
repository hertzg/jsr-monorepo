import { parse as parseYaml } from "@std/yaml";
import { getPackageNames, getPackages } from "./utils.ts";

type TitleWorkflow = {
  jobs: {
    main: {
      steps: {
        with?: {
          scopes?: string;
        };
      }[];
    };
  };
};

const workflow = parseYaml(
  await Deno.readTextFile(".github/workflows/title.yaml"),
) as TitleWorkflow;

const scopesStep = workflow.jobs.main.steps.find((step) => step.with?.scopes);
const scopesString = scopesStep?.with?.scopes ?? "";
const scopes = new Set(
  scopesString.split("\n").map((s) => s.trim()).filter((s) => s),
);

const packages = await getPackages();

let failed = false;

for (const pkg of packages) {
  if (!scopes.has(pkg.name)) {
    console.warn(`check_title: No scope found for ${pkg.name}`);
    failed = true;
  }
}

// Warn about extra scopes (does not cause failure)
const packageNames = getPackageNames(packages);
for (const scope of scopes) {
  if (!packageNames.has(scope)) {
    console.warn(
      `check_title: Extra scope "${scope}" does not match any workspace`,
    );
  }
}

if (failed) {
  Deno.exit(1);
}

console.log("check_title: ok");
