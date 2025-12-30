import denoJson from "../deno.json" with { type: "json" };
import { parse as parseYaml } from "@std/yaml";
import { join } from "@std/path";

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

const workspaceJsonList = Promise.all(
  denoJson.workspace.map((w) =>
    Deno.readTextFile(join(w, "deno.json")).then(JSON.parse).then((
      json: { name: string },
    ) => json.name)
  ),
);

let failed = false;

for (const name of await workspaceJsonList) {
  if (!scopes.has(name)) {
    console.warn(`check_title: No scope found for ${name}`);
    failed = true;
  }
}

// Warn about extra scopes (does not cause failure)
const workspaceNames = new Set(await workspaceJsonList);
for (const scope of scopes) {
  if (!workspaceNames.has(scope)) {
    console.warn(
      `check_title: Extra scope "${scope}" does not match any workspace`,
    );
  }
}

if (failed) {
  Deno.exit(1);
}

console.log("check_title: ok");
