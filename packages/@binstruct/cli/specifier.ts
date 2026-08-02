/**
 * Package specifier resolution for the Binary Structure CLI.
 *
 * The first word of every invocation names a package. Spelling it in full
 * (`jsr:@binstruct/png`) is boilerplate in the overwhelmingly common case, so a
 * bare name implies the `jsr:` scheme and the `@binstruct` scope. Resolution is
 * a pure function of the input string, by first match:
 *
 * | input                                      | rule                | resolves to             |
 * | ------------------------------------------ | ------------------- | ----------------------- |
 * | `jsr:@binstruct/png`, `npm:x`, `https://…` | has a scheme        | unchanged               |
 * | `./x/mod.ts`, `/abs/mod.js`, `mod.ts`      | names a module file | `file://` URL under cwd |
 * | `./x`, `../x`, `/abs/x`                    | names no module     | `file://` URL under cwd |
 * | `@hertzg/xhb`                              | starts with `@`     | `jsr:@hertzg/xhb`       |
 * | `png`, `wav@0.2.0`                         | bare                | `jsr:@binstruct/png`    |
 *
 * A path is made absolute against the working directory rather than passed
 * through, because the two consumers of a specifier disagree about what a
 * relative one means: `deno doc` resolves it against the process's working
 * directory, while `import()` resolves it against the importing module — this
 * file — so `./pkg` would be discovered in one place and loaded from another.
 * Anchoring it once, here, is what keeps the two looking at the same module.
 * {@linkcode ResolvedSpecifier.short} keeps the typed form, so listings and
 * `TRY` lines still say `./pkg`.
 *
 * The two path rows differ only in their {@linkcode SpecifierForm}, and the
 * split exists for the same reason as the anchoring: `deno doc ./pkg` walks
 * into the directory and documents `./pkg/mod.ts`, while `import()` refuses a
 * directory outright, so a `"directory"` input would again have discovery and
 * execution looking at different things. The classification is syntactic — a
 * module file is one ending in a module extension — so nothing here is read off
 * disk; the caller refuses the form and names {@linkcode moduleInside} instead.
 *
 * Nothing here consults the registry or the network, and nothing is read off
 * disk, so an unknown bare name resolves happily and fails later, at load time.
 *
 * @module
 */

import { resolve, toFileUrl } from "@std/path";

/**
 * Matches a URL scheme prefix, requiring at least two lowercase characters
 * before the colon so that a bare package name — or a single-letter Windows
 * drive prefix — can never be mistaken for one.
 */
const SCHEME_PATTERN = /^[a-z][a-z0-9+.-]+:/;

/** File extensions that make an input look like a module path. */
const MODULE_EXTENSIONS = [".ts", ".tsx", ".js", ".mjs", ".cjs"];

/** Scheme implied by a specifier that names a package but no registry. */
const JSR_SCHEME = "jsr:";

/** Scope implied by a bare package name. */
const IMPLIED_SCOPE = "@binstruct/";

/** Module a directory is conventionally entered through. */
const DEFAULT_ENTRYPOINT = "mod.ts";

/**
 * Which resolution rule matched an input.
 *
 * - `"scheme"` — the input carried its own scheme (`jsr:`, `npm:`, `https:`).
 * - `"path"` — the input pointed at a module file, by extension.
 * - `"directory"` — the input pointed somewhere on disk without naming a module
 *   file. A directory is the case that provokes it, and the only one worth a
 *   message: `import()` cannot load one, so the CLI refuses the form rather
 *   than let discovery describe a module the run could never reach.
 * - `"scoped"` — the input named a scope and package, without a scheme.
 * - `"bare"` — the input named a package only.
 *
 * The first three are explicit forms and pass through untouched; the last two
 * are shorthand and get expanded.
 */
export type SpecifierForm =
  | "scheme"
  | "path"
  | "directory"
  | "scoped"
  | "bare";

/**
 * A user-typed package argument and everything derived from it.
 */
export interface ResolvedSpecifier {
  /** The argument exactly as the user typed it. */
  readonly input: string;
  /** The module specifier to hand to `import()` or `deno doc`. */
  readonly specifier: string;
  /**
   * The shortest form that resolves back to {@linkcode ResolvedSpecifier.specifier},
   * for listings and `TRY` lines. Equal to `shortenSpecifier(specifier)`, except
   * for a path, where it is the input itself — a path is anchored to the working
   * directory the CLI was started in, and only the typed form still says so.
   */
  readonly short: string;
  /** The resolution rule that matched. */
  readonly form: SpecifierForm;
  /** Whether the input was shorthand, and therefore expanded. */
  readonly shorthand: boolean;
}

/**
 * Classifies an input by the first resolution rule that matches it.
 *
 * @param input Package argument as typed.
 * @returns The matching rule.
 */
function classify(input: string): SpecifierForm {
  if (SCHEME_PATTERN.test(input)) {
    return "scheme";
  }
  if (MODULE_EXTENSIONS.some((extension) => input.endsWith(extension))) {
    return "path";
  }
  if (input.startsWith(".") || input.startsWith("/")) {
    return "directory";
  }
  return input.startsWith("@") ? "scoped" : "bare";
}

/**
 * Applies the scheme-and-scope expansion a classification calls for.
 *
 * Deliberately pure, including for a path, which {@linkcode resolveSpecifier}
 * anchors to the working directory afterwards. That keeps
 * {@linkcode shortenSpecifier}, whose round trip runs through here, free of
 * both the `Deno.cwd()` read and the question of where the caller happens to
 * be standing.
 *
 * @param input Package argument as typed.
 * @param form The rule that matched.
 * @returns The module specifier, with a path left relative.
 */
function expand(input: string, form: SpecifierForm): string {
  switch (form) {
    case "scheme":
    case "path":
    case "directory":
      return input;
    case "scoped":
      return `${JSR_SCHEME}${input}`;
    case "bare":
      return `${JSR_SCHEME}${IMPLIED_SCOPE}${input}`;
  }
}

/**
 * Resolves a user-typed package argument to a module specifier.
 *
 * Version suffixes ride along unchanged, so `wav@0.2.0` becomes
 * `jsr:@binstruct/wav@0.2.0`. Bare-name resolution is unconditional: there is
 * no registry lookup and no fallback to another scope, so `xhb` resolves to
 * `jsr:@binstruct/xhb` and fails at load time rather than finding
 * `@hertzg/xhb`.
 *
 * A path is anchored to the working directory and returned as a `file://` URL,
 * so that discovery and `import()` — which disagree about what a relative
 * specifier is relative to — resolve it to the same module. Reading
 * `Deno.cwd()` is the one thing this function needs from outside its argument,
 * and only for that form.
 *
 * A path that names no module file is classified `"directory"` rather than
 * `"path"`. It still resolves, so the caller can echo where it pointed, but the
 * caller is expected to refuse it and offer {@linkcode moduleInside} instead:
 * `deno doc` would enter the directory and `import()` would not.
 *
 * @param input Package argument as typed on the command line.
 * @returns The input, its resolved specifier, its short form and how it was classified.
 *
 * @example A bare name implies `jsr:` and the `@binstruct` scope
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { resolveSpecifier } from "./specifier.ts";
 *
 * const resolved = resolveSpecifier("png");
 *
 * assertEquals(resolved.specifier, "jsr:@binstruct/png");
 * assertEquals(resolved.short, "png");
 * assertEquals(resolved.form, "bare");
 * assertEquals(resolved.shorthand, true);
 * ```
 *
 * @example A scope, a scheme and a path
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { toFileUrl } from "@std/path";
 * import { resolveSpecifier } from "./specifier.ts";
 *
 * assertEquals(resolveSpecifier("@hertzg/xhb").specifier, "jsr:@hertzg/xhb");
 * assertEquals(resolveSpecifier("npm:foo").specifier, "npm:foo");
 *
 * const local = resolveSpecifier("./local/mod.ts");
 *
 * assertEquals(local.specifier, toFileUrl(`${Deno.cwd()}/local/mod.ts`).href);
 * assertEquals(local.short, "./local/mod.ts");
 * assertEquals(local.form, "path");
 * ```
 *
 * @example A path that names no module file is told apart from one that does
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { resolveSpecifier } from "./specifier.ts";
 *
 * assertEquals(resolveSpecifier("./local").form, "directory");
 * assertEquals(resolveSpecifier("./local/mod.ts").form, "path");
 * ```
 *
 * @example A version suffix rides along
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { resolveSpecifier } from "./specifier.ts";
 *
 * assertEquals(
 *   resolveSpecifier("wav@0.2.0").specifier,
 *   "jsr:@binstruct/wav@0.2.0",
 * );
 * ```
 */
export function resolveSpecifier(input: string): ResolvedSpecifier {
  const form = classify(input);

  if (form === "path" || form === "directory") {
    return {
      input,
      specifier: toFileUrl(resolve(input)).href,
      short: input,
      form,
      shorthand: false,
    };
  }

  const specifier = expand(input, form);
  return {
    input,
    specifier,
    short: shortenSpecifier(specifier),
    form,
    shorthand: form === "scoped" || form === "bare",
  };
}

/**
 * Yields the candidate short forms of a specifier, shortest first.
 *
 * @param specifier A resolved module specifier.
 * @returns Candidates to test against {@linkcode resolveSpecifier}.
 */
function* shortCandidates(specifier: string): Generator<string> {
  if (!specifier.startsWith(JSR_SCHEME)) {
    return;
  }
  const name = specifier.slice(JSR_SCHEME.length);
  if (name.startsWith(IMPLIED_SCOPE)) {
    yield name.slice(IMPLIED_SCOPE.length);
  }
  yield name;
}

/**
 * Renders the shortest form of a specifier that still resolves back to it.
 *
 * The CLI echoes the resolved specifier once, as a header, and uses this short
 * form everywhere else — in listings and in the paste-ready `TRY` lines — since
 * the shorthand only helps if the tool teaches it. Each candidate is classified
 * and expanded again before it is offered, so a shortening that would be read
 * back as something else (a path, say) is never proposed.
 *
 * @param specifier A resolved module specifier.
 * @returns The shortest equivalent input, or the specifier itself when it cannot be shortened.
 *
 * @example The implied scheme and scope drop away
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { shortenSpecifier } from "./specifier.ts";
 *
 * assertEquals(shortenSpecifier("jsr:@binstruct/png"), "png");
 * assertEquals(shortenSpecifier("jsr:@hertzg/xhb"), "@hertzg/xhb");
 * assertEquals(shortenSpecifier("npm:foo"), "npm:foo");
 * ```
 *
 * @example Shortening never produces something that reads back as a path
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { resolveSpecifier, shortenSpecifier } from "./specifier.ts";
 *
 * const short = shortenSpecifier("jsr:@binstruct/mod.ts");
 *
 * assertEquals(short, "jsr:@binstruct/mod.ts");
 * assertEquals(resolveSpecifier(short).specifier, "jsr:@binstruct/mod.ts");
 * ```
 */
export function shortenSpecifier(specifier: string): string {
  for (const candidate of shortCandidates(specifier)) {
    if (expand(candidate, classify(candidate)) === specifier) {
      return candidate;
    }
  }
  return specifier;
}

/**
 * Names the module a `"directory"` input was probably reaching for.
 *
 * The suggestion is conventional rather than discovered: nothing is read off
 * disk, so this proposes `mod.ts` — the entrypoint every package in this
 * repository uses, and the one `deno doc` itself walks into — and leaves the
 * user to correct it if their package is spelled otherwise. Keeping it a guess
 * is what preserves the property that resolution consults only the input string
 * and the working directory.
 *
 * @param path A path input, typically one that classified as `"directory"`
 * @returns The same path with the conventional entrypoint appended
 *
 * @example The entrypoint to offer when a directory was typed
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { moduleInside, resolveSpecifier } from "./specifier.ts";
 *
 * assertEquals(moduleInside("./mypkg"), "./mypkg/mod.ts");
 * assertEquals(moduleInside("./mypkg/"), "./mypkg/mod.ts");
 * assertEquals(moduleInside("."), "./mod.ts");
 * assertEquals(resolveSpecifier(moduleInside("./mypkg")).form, "path");
 * ```
 */
export function moduleInside(path: string): string {
  const base = path.endsWith("/") ? path : `${path}/`;
  return `${base}${DEFAULT_ENTRYPOINT}`;
}
