/**
 * Coder discovery for the Binary Structure CLI.
 *
 * Discovery answers "what coders does this package expose?" by reading the
 * package's *types* rather than by importing it: it shells out to
 * `deno doc --json --quiet <specifier>` and keeps every exported function
 * whose return type renders as `Coder<…>`. Nothing in the target package is
 * evaluated, so merely looking around never runs third-party code, and the
 * JSDoc — which is lost at runtime — survives to become the one-line
 * description shown next to each coder.
 *
 * The resolved package version falls out of the same call: symbol locations
 * for a JSR specifier are absolute `https://jsr.io/@scope/name/1.2.3/mod.ts`
 * URLs.
 *
 * Discovery is only ever asked about a specifier that names **one module**: a
 * directory is refused before this runs (`./target.ts`, ADR 0004). That is what
 * makes the output here a single node, and what makes the coders it lists the
 * coders of the module the run will import. Pointed at a directory, `deno doc`
 * emits one node per module file it finds underneath — no entrypoint among
 * them — and reading any one of those is a guess about which module was meant.
 *
 * `deno info` is deliberately **not** part of the happy path. It is run only
 * by {@linkcode diagnoseEmptyDiscovery}, to tell "this is not a binstruct
 * package at all" apart from "it is one, but ships no type declarations".
 *
 * See `@binstruct/cli` ADR 0002.
 *
 * @module
 */

/** The dependency whose presence marks a package as binstruct-based. */
const BINSTRUCT_PACKAGE = "@hertzg/binstruct";

/** Return type repr that marks an exported function as a coder factory. */
const CODER_TYPE_REPR = "Coder";

/**
 * Parameter kinds that never contribute to the required-argument count:
 * `assign` is a parameter with a default value, `rest` is a `...args` tail.
 */
const NON_REQUIRED_PARAM_KINDS = new Set(["assign", "rest"]);

const decoder = new TextDecoder();

/**
 * A parameter of a declaration in `deno doc --json` output.
 */
export type DenoDocParam = {
  /** Binding form: `identifier`, `assign`, `rest`, `object` or `array`. */
  kind: string;
  /** Whether the parameter was declared with a trailing `?`. */
  optional?: boolean;
};

/**
 * A type reference in `deno doc --json` output.
 */
export type DenoDocType = {
  /** Rendered type name, e.g. `Coder`. Absent for anonymous forms like unions. */
  repr?: string;
  /** Resolved details, including the type arguments of a generic reference. */
  value?: {
    /** Type arguments, so `typeParams[0]` is the `T` of `Coder<T>`. */
    typeParams?: DenoDocType[];
  };
};

/**
 * A single declaration of an exported symbol in `deno doc --json` output.
 */
export type DenoDocDeclaration = {
  /** Declaration kind, e.g. `function`, `variable`, `interface`. */
  kind: string;
  /** Where the declaration lives; the version rides along for JSR specifiers. */
  location: { filename: string };
  /** The declaration's JSDoc, when it has one. */
  jsDoc?: { doc?: string };
  /** Kind-specific detail; for functions, the signature. */
  def: {
    /** Declared parameters, in order. */
    params?: DenoDocParam[];
    /** Declared or inferred return type. */
    returnType?: DenoDocType;
  };
};

/**
 * An exported symbol in `deno doc --json` output.
 */
export type DenoDocSymbol = {
  /** The exported name. */
  name: string;
  /** One entry per declaration, e.g. one per overload. */
  declarations: DenoDocDeclaration[];
};

/**
 * A module entry in `deno doc --json` output.
 */
export type DenoDocNode = {
  /** The `@module` JSDoc of the documented module. */
  module_doc?: { doc?: string };
  /** Every exported symbol, in declaration order. */
  symbols: DenoDocSymbol[];
};

/**
 * The `deno doc --json` document, narrowed to the parts discovery reads.
 *
 * A specifier that names one module produces exactly one entry under `nodes`,
 * keyed by the module `deno doc` resolved — the specifier itself for a registry
 * one. A directory produces one entry per module file found under it, which is
 * why directories are refused before discovery runs.
 */
export type DenoDocJson = {
  /** One entry per documented module, keyed by the module's own URL. */
  nodes: Record<string, DenoDocNode>;
};

/**
 * A coder factory found in a package's public types.
 */
export type DiscoveredCoder = {
  /** The exported name, e.g. `pngFile`. */
  name: string;
  /** The `T` of `Coder<T>`, absent when it is an anonymous type such as a union. */
  decodedType?: string;
  /** First line of the factory's JSDoc, absent when it is undocumented. */
  summary?: string;
  /** Arguments the caller must supply; `0` means the CLI can call it directly. */
  requiredParams: number;
};

/**
 * The public surface of a package as read from its type declarations.
 */
export type PackageSurface = {
  /** Resolved version, when the specifier resolved to a JSR package. */
  version?: string;
  /** First line of the module JSDoc, absent when the module is undocumented. */
  summary?: string;
  /** Coder factories, zero-required-parameter ones first. */
  coders: DiscoveredCoder[];
};

/**
 * Why a `deno` subprocess spawned by discovery produced no usable output.
 *
 * - `permission-denied` — the CLI was run without `--allow-run=deno`.
 *   Decoding and encoding still work; only discovery is unavailable.
 * - `not-spawned` — the process could not be started at all, e.g. no `deno`
 *   on `PATH`.
 * - `minimum-dependency-age` — the requested version is younger than the
 *   consuming project's `minimumDependencyAge`, so the graph refused to
 *   resolve. Nothing about the invocation was wrong.
 * - `exited-non-zero` — anything else the tool rejected: unknown package,
 *   network failure, syntax error in a local entrypoint.
 * - `graph-incomplete` — the tool succeeded, but the module graph it printed
 *   carries an error, so it was never walked. `deno info` exits 0 in this
 *   case, which would otherwise read as a graph that simply contains nothing.
 */
export type ToolFailureReason =
  | "permission-denied"
  | "not-spawned"
  | "minimum-dependency-age"
  | "exited-non-zero"
  | "graph-incomplete";

/**
 * A `deno` subprocess that did not produce usable output.
 */
export type ToolFailure = {
  /** Discriminant: this outcome carries no result. */
  ok: false;
  /** Which environmental condition stopped the tool. */
  reason: ToolFailureReason;
  /** The specifier discovery was asked about. */
  specifier: string;
  /** The argument vector, for a reproducible line in an error message. */
  command: string[];
  /** Exit status, absent when the process never started. */
  code?: number;
  /** The subprocess's stderr, or the message of the error that replaced it. */
  stderr: string;
};

/**
 * A package whose type declarations were read successfully.
 *
 * `coders` may still be empty — a package that exposes none is a successful
 * discovery with nothing to offer, not a failure. Feed that case to
 * {@linkcode diagnoseEmptyDiscovery} to find out why.
 */
export type DiscoverySuccess = PackageSurface & {
  /** Discriminant: this outcome carries a surface. */
  ok: true;
  /** The specifier that was inspected. */
  specifier: string;
};

/**
 * The result of {@linkcode discoverCoders}.
 */
export type DiscoveryOutcome = DiscoverySuccess | ToolFailure;

/**
 * The result of {@linkcode readSymbolDocs}.
 */
export type SymbolDocsOutcome = {
  /** Discriminant: this outcome carries documentation. */
  ok: true;
  /** `deno doc` output verbatim, module preamble included. */
  text: string;
} | ToolFailure;

/**
 * The result of {@linkcode diagnoseEmptyDiscovery}.
 */
export type EmptyDiscoveryDiagnosis = {
  /** Discriminant: the module graph was read. */
  ok: true;
  /** The specifier that was inspected. */
  specifier: string;
  /**
   * Whether the module graph reaches `@hertzg/binstruct`.
   *
   * `true` means the package is binstruct-based but ships no type
   * declarations discovery can see; `false` means it is not a binstruct
   * package at all.
   */
  dependsOnBinstruct: boolean;
} | ToolFailure;

/**
 * Returns the first non-empty line of a JSDoc block.
 *
 * @param doc The raw JSDoc body
 * @returns The first line, trimmed, or `undefined` when there is no prose
 */
function firstLine(doc: string | undefined): string | undefined {
  const line = doc?.split("\n", 1)[0].trim();
  return line ? line : undefined;
}

/**
 * Counts the arguments a caller must supply to a declaration.
 *
 * @param params The declaration's parameter list
 * @returns Number of parameters that are neither optional, defaulted nor rest
 */
function countRequiredParams(params: DenoDocParam[] | undefined): number {
  return (params ?? []).filter((param) =>
    param.optional !== true && !NON_REQUIRED_PARAM_KINDS.has(param.kind)
  ).length;
}

/**
 * Extracts the resolved JSR version from the symbols' source locations.
 *
 * Only a `jsr:` specifier has one. Symbols re-exported from other packages are
 * skipped by requiring the location to sit under the package's own
 * `https://jsr.io/@scope/name/` prefix.
 *
 * @param key The key under `nodes`, which for a JSR package is the specifier as given
 * @param symbols The module's exported symbols
 * @returns The resolved version, or `undefined` for non-JSR specifiers
 */
function resolvedVersion(
  key: string,
  symbols: DenoDocSymbol[],
): string | undefined {
  const jsrName = /^jsr:(@[^/@]+\/[^@]+)/.exec(key)?.[1];
  if (jsrName === undefined) return undefined;

  const prefix = `https://jsr.io/${jsrName}/`;
  for (const symbol of symbols) {
    for (const declaration of symbol.declarations) {
      const { filename } = declaration.location;
      if (filename.startsWith(prefix)) {
        return filename.slice(prefix.length).split("/", 1)[0];
      }
    }
  }
  return undefined;
}

/**
 * Reads a package's discoverable surface out of parsed `deno doc --json` output.
 *
 * This is the whole of the JSON-shape knowledge, kept pure so it can be tested
 * against captured fixtures without a subprocess. A symbol counts as a coder
 * factory when it is declared as a function whose return type renders as
 * `Coder` — a string match, per ADR 0002, so a coder hidden behind a type alias
 * that renders as something else is invisible here.
 *
 * Coders that take no required arguments are listed first, because those are
 * the ones the CLI can invoke on the user's behalf (ADR 0005). Declaration
 * order is preserved within each group.
 *
 * The single node is read without choosing between nodes, which is sound only
 * because the specifier named one module: a directory, whose output holds one
 * node per file under it, never reaches here (`./target.ts`, ADR 0004).
 *
 * @param doc Parsed output of `deno doc --json --quiet <specifier>`
 * @returns The module summary, resolved version and coder list
 *
 * @example Read the coders of a package
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { readDocSurface } from "./discover.ts";
 *
 * const surface = readDocSurface({
 *   nodes: {
 *     "jsr:@binstruct/arp": {
 *       module_doc: { doc: "ARP packet encoding and decoding.\nRFC 826." },
 *       symbols: [{
 *         name: "arpData",
 *         declarations: [{
 *           kind: "function",
 *           location: { filename: "https://jsr.io/@binstruct/arp/0.3.0/mod.ts" },
 *           jsDoc: { doc: "Creates a coder for ARP packets.\n" },
 *           def: {
 *             params: [],
 *             returnType: {
 *               repr: "Coder",
 *               value: { typeParams: [{ repr: "ArpData" }] },
 *             },
 *           },
 *         }],
 *       }],
 *     },
 *   },
 * });
 *
 * assertEquals(surface.version, "0.3.0");
 * assertEquals(surface.summary, "ARP packet encoding and decoding.");
 * assertEquals(surface.coders, [{
 *   name: "arpData",
 *   decodedType: "ArpData",
 *   summary: "Creates a coder for ARP packets.",
 *   requiredParams: 0,
 * }]);
 * ```
 */
export function readDocSurface(doc: DenoDocJson): PackageSurface {
  const [key, node] = Object.entries(doc.nodes)[0];

  const nullary: DiscoveredCoder[] = [];
  const parameterized: DiscoveredCoder[] = [];

  for (const symbol of node.symbols) {
    for (const declaration of symbol.declarations) {
      const { returnType } = declaration.def;
      if (
        declaration.kind !== "function" || returnType?.repr !== CODER_TYPE_REPR
      ) {
        continue;
      }

      const requiredParams = countRequiredParams(declaration.def.params);
      const decodedType = returnType.value?.typeParams?.[0]?.repr;
      const summary = firstLine(declaration.jsDoc?.doc);

      const coder: DiscoveredCoder = {
        name: symbol.name,
        ...(decodedType === undefined ? {} : { decodedType }),
        ...(summary === undefined ? {} : { summary }),
        requiredParams,
      };
      (requiredParams === 0 ? nullary : parameterized).push(coder);
    }
  }

  const version = resolvedVersion(key, node.symbols);
  const summary = firstLine(node.module_doc?.doc);

  return {
    ...(version === undefined ? {} : { version }),
    ...(summary === undefined ? {} : { summary }),
    coders: [...nullary, ...parameterized],
  };
}

/**
 * Runs `deno` with the given arguments and captures its output.
 *
 * @param args Arguments to pass to `deno`
 * @param specifier The specifier under inspection, echoed into failures
 * @param env Environment overrides for the subprocess
 * @returns The captured stdout, or the reason the tool produced none
 */
async function runDeno(
  args: string[],
  specifier: string,
  env: Record<string, string> = {},
): Promise<{ ok: true; stdout: string } | ToolFailure> {
  const command = ["deno", ...args];

  let output: Deno.CommandOutput;
  try {
    output = await new Deno.Command("deno", {
      args,
      env,
      stdout: "piped",
      stderr: "piped",
    }).output();
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Deno.errors.NotCapable
        ? "permission-denied"
        : "not-spawned",
      specifier,
      command,
      stderr: error instanceof Error ? error.message : String(error),
    };
  }

  const stderr = decoder.decode(output.stderr);
  if (!output.success) {
    return {
      ok: false,
      reason: stderr.toLowerCase().includes("minimum dependency age")
        ? "minimum-dependency-age"
        : "exited-non-zero",
      specifier,
      command,
      code: output.code,
      stderr,
    };
  }

  return { ok: true, stdout: decoder.decode(output.stdout) };
}

/**
 * Discovers the coder factories a package exposes, without importing it.
 *
 * Runs `deno doc --json --quiet <specifier>` and reads the result with
 * {@linkcode readDocSurface}. Requires permission to spawn `deno`
 * (`--allow-run=deno`); without it the outcome is a `permission-denied`
 * {@linkcode ToolFailure} and callers should fall back to asking for an
 * explicit coder name.
 *
 * A cold lookup pays for building the module graph — on the order of a second
 * for a JSR package — while a warm one is near-instant.
 *
 * The specifier must name a single module; callers refuse a directory first
 * (`./target.ts`).
 *
 * @param specifier A resolved specifier, e.g. `jsr:@binstruct/arp` or a module path
 * @returns The discovered surface, or why `deno doc` produced none
 *
 * @example Discover the single coder of a local package
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { discoverCoders } from "./discover.ts";
 *
 * const outcome = await discoverCoders(import.meta.resolve("../arp/mod.ts"));
 *
 * assertEquals(outcome.ok, true);
 * if (outcome.ok) {
 *   assertEquals(outcome.coders.map((coder) => coder.name), ["arpData"]);
 *   assertEquals(outcome.coders[0].requiredParams, 0);
 * }
 * ```
 */
export async function discoverCoders(
  specifier: string,
): Promise<DiscoveryOutcome> {
  const run = await runDeno(["doc", "--json", "--quiet", specifier], specifier);
  if (!run.ok) return run;

  return {
    ok: true,
    specifier,
    ...readDocSurface(JSON.parse(run.stdout) as DenoDocJson),
  };
}

/**
 * Returns `deno doc`'s formatted documentation for one exported symbol.
 *
 * Backs the `--docs` flag. Formatting is delegated to `deno doc` rather than
 * reimplemented, so the output matches what the user would see running the
 * tool themselves — including the module doc that `--filter` prints as a
 * preamble.
 *
 * The positional form `deno doc <specifier> <Symbol>` is not used: it treats
 * the symbol as a file path and fails for `jsr:` specifiers, so `--filter` is
 * the only working spelling.
 *
 * The subprocess colours its output whether or not it is talking to a
 * terminal, and it is talking to a pipe here by construction. The colour
 * decision is therefore taken from *this* process's stdout, so
 * `--docs > notes.txt` writes plain text while `--docs` on a terminal stays
 * readable.
 *
 * @param specifier A resolved specifier, e.g. `jsr:@binstruct/arp` or a path
 * @param symbol The exported name to document, e.g. `arpData`
 * @returns The formatted documentation, or why `deno doc` produced none
 *
 * @example Render the docs of one coder
 * ```ts
 * import { assertEquals, assertStringIncludes } from "@std/assert";
 * import { readSymbolDocs } from "./discover.ts";
 *
 * const docs = await readSymbolDocs(
 *   import.meta.resolve("../arp/mod.ts"),
 *   "arpData",
 * );
 *
 * assertEquals(docs.ok, true);
 * if (docs.ok) assertStringIncludes(docs.text, "arpData");
 * ```
 */
export async function readSymbolDocs(
  specifier: string,
  symbol: string,
): Promise<SymbolDocsOutcome> {
  const run = await runDeno(
    ["doc", "--filter", symbol, specifier],
    specifier,
    Deno.stdout.isTerminal() ? {} : { NO_COLOR: "1" },
  );
  if (!run.ok) return run;

  return { ok: true, text: run.stdout };
}

/**
 * Explains why a package yielded no coders, by reading its module graph.
 *
 * Runs `deno info --json --quiet <specifier>` and reports whether anything in
 * the graph resolves to `@hertzg/binstruct`. Per ADR 0002 this is **not** part
 * of the happy path: call it only after {@linkcode discoverCoders} succeeded
 * with an empty `coders` list, since it rebuilds the graph a second time and
 * answers nothing a non-empty discovery has not already answered.
 *
 * `deno info` exits 0 even when it could not resolve the root, reporting the
 * problem as an `error` on the offending module instead. A graph carrying one
 * was never walked, so it is a `graph-incomplete` failure rather than evidence
 * that the package is not binstruct-based — the two are indistinguishable from
 * the module list alone, and the confident verdict is the wrong one.
 *
 * @param specifier A resolved specifier, e.g. `jsr:@hertzg/mac` or a path
 * @returns Whether the graph depends on binstruct, or why `deno info` failed
 *
 * @example A package with no coders that is not binstruct-based
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { diagnoseEmptyDiscovery } from "./discover.ts";
 *
 * const diagnosis = await diagnoseEmptyDiscovery(
 *   import.meta.resolve("../../@hertzg/mac/mod.ts"),
 * );
 *
 * assertEquals(diagnosis.ok, true);
 * if (diagnosis.ok) assertEquals(diagnosis.dependsOnBinstruct, false);
 * ```
 */
export async function diagnoseEmptyDiscovery(
  specifier: string,
): Promise<EmptyDiscoveryDiagnosis> {
  const args = ["info", "--json", "--quiet", specifier];
  const run = await runDeno(args, specifier);
  if (!run.ok) return run;

  const graph = JSON.parse(run.stdout) as {
    modules: { specifier: string; error?: string }[];
  };

  for (const module of graph.modules) {
    if (module.error !== undefined) {
      return {
        ok: false,
        reason: "graph-incomplete",
        specifier,
        command: ["deno", ...args],
        code: 0,
        stderr: module.error,
      };
    }
  }

  return {
    ok: true,
    specifier,
    dependsOnBinstruct: graph.modules.some((module) =>
      module.specifier.includes(BINSTRUCT_PACKAGE)
    ),
  };
}
