/**
 * Package specifier resolution for the Binary Structure CLI.
 *
 * The first word of every invocation names a package. Spelling it in full
 * (`jsr:@binstruct/png`) is boilerplate in the overwhelmingly common case, so a
 * bare name implies the `jsr:` scheme and the `@binstruct` scope. Resolution is
 * a pure function of the input string, by first match:
 *
 * | input                                       | rule         | resolves to             |
 * | ------------------------------------------- | ------------ | ----------------------- |
 * | `jsr:@binstruct/png`, `npm:x`, `https://…`  | known scheme | unchanged               |
 * | `@hertzg/xhb`, `@binstruct/png/sub`         | starts `@`   | `jsr:@hertzg/xhb`       |
 * | `./x`, `/abs/x`, `pkg/`, `a/b`, `mod.ts`    | is a path    | `file://` URL under cwd |
 * | `png`, `wav@0.2.0`                          | bare         | `jsr:@binstruct/png`    |
 *
 * Both explicit rules are **closed sets**, and everything left over is a path.
 * A scheme is one of {@linkcode MODULE_SCHEMES}, the seven Deno resolves a
 * module under. A JSR or npm coordinate is exactly one of `name`,
 * `name@version`, `@scope/name`, `@scope/name@version` or
 * `@scope/name/sub-entrypoint`, and every one of those either starts with `@`
 * or contains no `/` at all — so **a non-scheme input that contains `/` and
 * does not start with `@` cannot be a coordinate, and is a path.** The set of
 * path spellings is open-ended and neither of the other two is, so the closed
 * ones are what get enumerated (ADR 0004).
 *
 * Whether a path names a file or a directory is deliberately *not* decided
 * here: that is a fact about the target, not about how the argument was typed,
 * so `./pkg`, `/abs/pkg`, `pkg/`, `file:///abs/pkg` and a symlink to any of
 * them all reach `inspectLocalTarget` in `./target.ts`, which stats the target
 * and refuses a directory.
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
 * Nothing here consults the registry, the network or the filesystem, so an
 * unknown bare name resolves happily and fails later, at load time.
 *
 * @module
 */

import { resolve, toFileUrl } from "@std/path";

/**
 * Every scheme Deno resolves a module specifier under.
 *
 * A **closed set**, not a pattern. `^[a-z][a-z0-9+.-]+:` accepted any word
 * before a colon, so `my:dir/mod.ts` — a perfectly ordinary relative path whose
 * first segment holds one — was called a scheme, passed through unanchored and
 * never stat'ed, while `deno doc` resolved it against the working directory as
 * the path it is. That is the discovery-versus-execution divergence again, in
 * one more spelling, and it is the same open-predicate mistake the coordinate
 * rule made: the set of things that are *not* schemes is unbounded, the set of
 * schemes is seven long. Anything else carrying a colon falls through to the
 * `/` rule and becomes a path, which is what `deno doc` already thinks it is.
 *
 * Membership is case-sensitive, so `JSR:@binstruct/png` is not one — it holds a
 * slash outside a scope and is therefore a path, exactly as `c:/tmp/pkg` is.
 */
const MODULE_SCHEMES: readonly string[] = [
  "jsr:",
  "npm:",
  "http:",
  "https:",
  "file:",
  "node:",
  "data:",
];

/**
 * Reports whether an input opens with a scheme Deno resolves modules under.
 *
 * @param input Package argument as typed.
 * @returns Whether it carries one of {@linkcode MODULE_SCHEMES}.
 */
function hasScheme(input: string): boolean {
  return MODULE_SCHEMES.some((scheme) => input.startsWith(scheme));
}

/**
 * File extensions that make an input look like a module path.
 *
 * Every extension the runtime will load, so that a real module is never
 * mistaken for something else: omitting `.mts` once made `./pkg/mod.mts` — a
 * module `deno doc` reads and `import()` loads — fail classification.
 */
const MODULE_EXTENSIONS = [
  ".ts",
  ".tsx",
  ".mts",
  ".cts",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
];

/**
 * Reports whether a name ends in an extension the runtime will load.
 *
 * Shared by classification here and by the directory listing in `./target.ts`,
 * so "what counts as a module" is answered in one place: a directory refusal
 * that offered names the classifier would then reject would be teaching a form
 * the tool does not accept.
 *
 * @param name A file name or path, e.g. `mod.ts` or `./pkg/mod.mts`.
 * @returns Whether it ends in a JS/TS module extension.
 *
 * @example Every extension the runtime loads counts, and nothing else
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { isModulePath } from "./specifier.ts";
 *
 * assertEquals(isModulePath("mod.ts"), true);
 * assertEquals(isModulePath("./pkg/mod.mts"), true);
 * assertEquals(isModulePath("deno.json"), false);
 * assertEquals(isModulePath("README.md"), false);
 * ```
 */
export function isModulePath(name: string): boolean {
  return MODULE_EXTENSIONS.some((extension) => name.endsWith(extension));
}

/** Scheme implied by a specifier that names a package but no registry. */
const JSR_SCHEME = "jsr:";

/** Scope implied by a bare package name. */
const IMPLIED_SCOPE = "@binstruct/";

/**
 * Which resolution rule matched an input.
 *
 * - `"scheme"` — the input opened with one of {@linkcode MODULE_SCHEMES}
 *   (`jsr:`, `npm:`, `http:`, `https:`, `file:`, `node:`, `data:`). A colon
 *   that is not one of those is just a character in a path.
 * - `"scoped"` — the input named a scope and package, without a scheme.
 * - `"path"` — the input pointed somewhere on disk: it held a `/` without being
 *   scoped, or began with `.`, or ended in a module extension. A file and a
 *   directory are the same form: which one it is cannot be read off the
 *   spelling, and nothing here goes looking. Nor is the form the place to ask —
 *   `file:///abs/pkg` is a `"scheme"` and names a directory all the same.
 * - `"bare"` — the input named a package only.
 *
 * `"scheme"` and `"path"` are explicit forms and pass through untouched;
 * `"scoped"` and `"bare"` are shorthand and get expanded.
 */
export type SpecifierForm = "scheme" | "path" | "scoped" | "bare";

/**
 * A user-typed package argument and everything derived from it.
 */
export interface ResolvedSpecifier {
  /** The argument exactly as the user typed it. */
  readonly input: string;
  /** The module specifier to hand to `deno doc`. */
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
 * The rules enumerate the **registry coordinate**, which is a closed grammar —
 * `name`, `name@version`, `@scope/name`, `@scope/name@version`,
 * `@scope/name/sub-entrypoint` — and let everything else be a path. Each of
 * those five forms either starts with `@` or holds no `/`, so a non-scheme
 * input holding a `/` outside a scope is not one, whatever else it may be.
 *
 * The rules used to run the other way, listing the path spellings and calling
 * the remainder a registry name. That list was open-ended and leaked five
 * times, most recently on `arp/` — the spelling shell tab-completion produces
 * for a directory — which starts with neither `.` nor `/`, ends in no module
 * extension, and so expanded to `jsr:@binstruct/arp/` and decoded against the
 * published package while a local `arp/` sat in the working directory. See
 * `./specifier.test.ts` for the enumerated classification space.
 *
 * The scheme rule runs first and is closed the same way, by
 * {@linkcode MODULE_SCHEMES}: it has to run first, since `https://example.com/`
 * holds a `/`, and while it was a pattern it took `my:dir/mod.ts` out of the
 * path rule's reach.
 *
 * The leading `.` and the module extension survive as rules because they can
 * only ever move an input *towards* `"path"`. The leak class is the fallthrough
 * — a path landing on `"bare"` or on `"scheme"` — and neither rule can produce
 * one.
 *
 * @param input Package argument as typed.
 * @returns The matching rule.
 */
function classify(input: string): SpecifierForm {
  if (hasScheme(input)) {
    return "scheme";
  }
  if (input.startsWith("@")) {
    return "scoped";
  }
  if (input.includes("/") || input.startsWith(".") || isModulePath(input)) {
    return "path";
  }
  return "bare";
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
 * Whether the path names a file or a directory is left open. Both are the
 * `"path"` form, because a directory and the module inside it are
 * indistinguishable as strings and `file:///abs/pkg` is as much a directory as
 * `./pkg` is; the CLI settles the question by stat'ing the resolved target
 * (`inspectLocalTarget` in `./target.ts`). `pkg/`, `./pkg` and `/abs/pkg`
 * therefore anchor to one URL and reach one decision — `resolve` normalizes
 * the trailing slash away.
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
 * @example A directory and the module inside it are the same form
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { resolveSpecifier } from "./specifier.ts";
 *
 * assertEquals(resolveSpecifier("./local").form, "path");
 * assertEquals(resolveSpecifier("./local/mod.mts").form, "path");
 * assertEquals(resolveSpecifier("file:///abs/local").form, "scheme");
 * ```
 *
 * @example A slash outside a scope is a path, whatever it is spelled like
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { resolveSpecifier } from "./specifier.ts";
 *
 * assertEquals(resolveSpecifier("local/").form, "path");
 * assertEquals(resolveSpecifier("nested/inner").form, "path");
 * assertEquals(
 *   resolveSpecifier("local/").specifier,
 *   resolveSpecifier("./local").specifier,
 * );
 * ```
 *
 * @example Only a known scheme is a scheme; any other colon is part of a path
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { resolveSpecifier } from "./specifier.ts";
 *
 * assertEquals(resolveSpecifier("node:fs").form, "scheme");
 * assertEquals(resolveSpecifier("data:text/plain,x").form, "scheme");
 * assertEquals(resolveSpecifier("my:dir/mod.ts").form, "path");
 * assertEquals(resolveSpecifier("gopher:x").form, "bare");
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

  if (form === "path") {
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
 * const short = shortenSpecifier("jsr:@binstruct/png/sub");
 *
 * assertEquals(short, "@binstruct/png/sub");
 * assertEquals(resolveSpecifier(short).specifier, "jsr:@binstruct/png/sub");
 * assertEquals(resolveSpecifier("png/sub").form, "path");
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
