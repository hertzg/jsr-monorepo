/**
 * Validates or regenerates the bundled `@binstruct` package registry shipped
 * with `@binstruct/cli`.
 *
 * The expected list is derived by running `deno doc --json` against every local
 * `@binstruct` package entrypoint and keeping the packages that expose at least
 * one coder factory — a `function` declaration whose return type renders as
 * `Coder`. `@binstruct/cli` itself is never a member.
 *
 * Usage:
 *   deno run -A _tools/check_cli_registry.ts          # Check registry.ts
 *   deno run -A _tools/check_cli_registry.ts --update # Rewrite registry.ts
 *
 * @module
 */

import { join, toFileUrl } from "@std/path";
import { getPackages, type PackageInfo } from "./utils.ts";

interface DocReturnType {
  repr: string;
}

interface DocDeclaration {
  kind: string;
  def?: { returnType?: DocReturnType };
}

interface DocSymbol {
  name: string;
  declarations: DocDeclaration[];
}

interface DocOutput {
  nodes: Record<string, { symbols: DocSymbol[] }>;
}

const SCOPE = "@binstruct";
const EXCLUDED = "@binstruct/cli";
const REGISTRY_PATH = "packages/@binstruct/cli/registry.ts";
const UPDATE_COMMAND = "deno run -A _tools/check_cli_registry.ts --update";

/**
 * Resolves the `.` entrypoint of a workspace package to a filesystem path.
 */
function entrypointOf(pkg: PackageInfo): string {
  const entry = typeof pkg.exports === "string"
    ? pkg.exports
    : pkg.exports["."];
  return join(pkg.workspacePath, entry);
}

/**
 * Returns true when the package entrypoint exposes at least one coder factory
 * under the ADR 0002 rule.
 */
async function exposesCoderFactory(entrypoint: string): Promise<boolean> {
  const command = new Deno.Command("deno", {
    args: ["doc", "--json", "--quiet", entrypoint],
    stdout: "piped",
    stderr: "piped",
  });

  const { success, stdout, stderr } = await command.output();
  if (!success) {
    throw new Error(
      `deno doc failed for ${entrypoint}:\n${new TextDecoder().decode(stderr)}`,
    );
  }

  const doc: DocOutput = JSON.parse(new TextDecoder().decode(stdout));

  return Object.values(doc.nodes).some((node) =>
    node.symbols.some((symbol) =>
      symbol.declarations.some((declaration) =>
        declaration.kind === "function" &&
        declaration.def?.returnType?.repr === "Coder"
      )
    )
  );
}

/**
 * Renders the full text of `registry.ts` for a list of short package names.
 */
function renderRegistry(names: readonly string[]): string {
  const entries = names.map((name) => `  ${JSON.stringify(name)},`).join("\n");
  return `// This file is auto-generated. Do not edit manually.
// Run: ${UPDATE_COMMAND}

/**
 * Short names of the \`${SCOPE}\` packages the CLI knows about, sorted
 * alphabetically.
 *
 * A package earns a place here by exposing at least one coder factory; the CLI
 * package itself is never a member. Prefix an entry with \`${SCOPE}/\` to get
 * the JSR coordinate.
 *
 * The list is a discovery hint, not a gate — any package resolvable by the
 * runtime remains usable as a specifier whether or not it appears here.
 *
 * @example Every name resolves to a \`${SCOPE}\` coordinate
 * \`\`\`ts
 * import { assertEquals } from "@std/assert";
 * import { KNOWN_PACKAGES } from "./registry.ts";
 *
 * assertEquals(KNOWN_PACKAGES.includes("png"), true);
 * assertEquals(KNOWN_PACKAGES.includes("cli"), false);
 * assertEquals(\`${SCOPE}/\${KNOWN_PACKAGES[0]}\`, "${SCOPE}/${names[0]}");
 * \`\`\`
 */
export const KNOWN_PACKAGES: readonly string[] = [
${entries}
];
`;
}

const rootPath = join(import.meta.dirname!, "../");
const updateMode = Deno.args.includes("--update");

const candidates = (await getPackages())
  .filter((pkg) => pkg.name.startsWith(`${SCOPE}/`) && pkg.name !== EXCLUDED);

const probed = await Promise.all(
  candidates.map(async (pkg) => ({
    pkg,
    hasCoder: await exposesCoderFactory(join(rootPath, entrypointOf(pkg))),
  })),
);

const expected = probed
  .filter(({ hasCoder }) => hasCoder)
  .map(({ pkg }) => pkg.dirName)
  .sort();

const registryPath = join(rootPath, REGISTRY_PATH);

if (updateMode) {
  await Deno.writeTextFile(registryPath, renderRegistry(expected));
  console.log(`check_cli_registry: updated ${expected.length} packages`);
} else {
  const { KNOWN_PACKAGES }: { KNOWN_PACKAGES: readonly string[] } =
    await import(toFileUrl(registryPath).href);

  const missing = expected.filter((name) => !KNOWN_PACKAGES.includes(name));
  const extra = KNOWN_PACKAGES.filter((name) => !expected.includes(name));
  const misordered = JSON.stringify([...KNOWN_PACKAGES].sort()) !==
    JSON.stringify([...KNOWN_PACKAGES]);

  for (const name of missing) {
    console.warn(
      `check_cli_registry: Missing entry "${name}" — it exposes a coder factory`,
    );
  }
  for (const name of extra) {
    console.warn(
      `check_cli_registry: Extra entry "${name}" — no coder factory found`,
    );
  }
  if (misordered) {
    console.warn("check_cli_registry: Entries are not sorted alphabetically");
  }

  if (missing.length > 0 || extra.length > 0 || misordered) {
    console.warn(`\nRun '${UPDATE_COMMAND}' to update the registry.`);
    Deno.exit(1);
  }

  console.log("check_cli_registry: ok");
}
