/**
 * What a package argument actually points at on this machine.
 *
 * Resolution (`./specifier.ts`) is a pure function of the input string, so it
 * ends at "this is a `file:` URL" and cannot say what is there. This module
 * asks the filesystem, and it asks about the **resolved target** rather than
 * about the spelling: `./pkg`, `pkg/`, `/abs/pkg`, `file:///abs/pkg` and a
 * symlink to any of them all name one thing and must reach one decision.
 * Two halves make that true and neither is sufficient alone — resolution
 * classifies every one of those spellings as a path or a `file:` URL and
 * normalizes the trailing slash away, and `Deno.stat` here follows symlinks.
 * `pkg/` reached neither for as long as classification called it a bare
 * registry name; see ADR 0004.
 *
 * The decision that matters is *directory or not*. `import()` cannot load a
 * directory at all — `ERR_UNSUPPORTED_DIR_IMPORT` — so there is no "the way
 * `import()` would resolve this directory" for the CLI to agree with, and any
 * entrypoint it settled on would be an opinion only it holds. `deno doc` holds
 * a different one: pointed at a directory it documents *every module file under
 * it*, one node per file, none of them an entrypoint. Reading the first of
 * those nodes decoded two bytes of input as a one-byte internal structure and
 * exited 0. So a directory is refused, and what is in it is listed for the user
 * to choose from — listing is guidance, picking would be resolution.
 *
 * See `@binstruct/cli` ADR 0004.
 *
 * @module
 */

import { fromFileUrl, join } from "@std/path";
import { isModulePath } from "./specifier.ts";

/** Scheme of every specifier that names something on this machine. */
const FILE_SCHEME = "file:";

/**
 * What sits at the far end of a resolved specifier.
 *
 * - `"elsewhere"` — not on this machine (`jsr:`, `npm:`, `https:`), so there is
 *   nothing to stat and the runtime resolves it.
 * - `"module"` — a file, which is what a package argument has to name.
 * - `"directory"` — refused, with {@linkcode LocalTarget.modules} offered as
 *   the candidates to name instead.
 * - `"missing"` — nothing is there at all, which is a different mistake from
 *   naming a directory and gets a different message.
 * - `"unreadable"` — the target could not be inspected: read permission was
 *   denied, or the `file:` specifier does not parse as a URL and so names no
 *   path to inspect at all. Refused rather than assumed to be a module:
 *   assuming is how the directory case produced confident wrong output.
 */
export type LocalTarget =
  | { readonly kind: "elsewhere" }
  | { readonly kind: "module" }
  | {
    readonly kind: "directory";
    /** Module file names directly inside it, sorted, possibly empty. */
    readonly modules: readonly string[];
  }
  | { readonly kind: "missing" }
  | {
    readonly kind: "unreadable";
    /** What the filesystem said, for the refusal line. */
    readonly reason: string;
  };

/**
 * Renders whatever a filesystem call threw as one line.
 *
 * @param error The thrown value
 * @returns Its message, or its string form
 */
function reasonOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Reports whether a path leads to a file that can be read.
 *
 * `Deno.stat` follows symlinks, so this answers about the target rather than
 * about the link, and anything that cannot be inspected at all answers `false`.
 *
 * @param path The path to inspect
 * @returns Whether a readable file sits at the far end
 */
async function isReadableFile(path: string): Promise<boolean> {
  try {
    return (await Deno.stat(path)).isFile;
  } catch {
    return false;
  }
}

/**
 * Lists the module files sitting directly inside a directory.
 *
 * Sorted, because `Deno.readDir` yields in whatever order the filesystem
 * happens to hold, and a listing that reorders itself between runs cannot be
 * quoted in a bug report.
 *
 * Every candidate is confirmed to be a readable **file at the far end of its
 * name**, which is the same target question the caller asks. `Deno.readDir`
 * reports what it finds without following links, so a symlink is neither a file
 * nor a directory to it: filtering on `isDirectory` alone listed a dangling
 * `aaa_link.ts` as a module and, since it sorted first, put it in the `TRY`
 * line, where it failed with `no such path`; a `*.ts` symlink pointing at a
 * directory landed straight back on the directory refusal. A refusal must never
 * name a command that does not work, so a link is kept only when it leads
 * somewhere `import()` could go.
 *
 * @param path The directory to read
 * @returns The module file names, sorted
 */
async function modulesInside(path: string): Promise<string[]> {
  const names: string[] = [];
  for await (const entry of Deno.readDir(path)) {
    if (!isModulePath(entry.name)) continue;
    if (entry.isFile || await isReadableFile(join(path, entry.name))) {
      names.push(entry.name);
    }
  }
  return names.sort();
}

/**
 * Reports what a resolved specifier points at, before anything is run on it.
 *
 * Called once per invocation, ahead of discovery, so that a directory is
 * refused before `deno doc` gets a chance to answer about a module nobody
 * asked about. A non-`file:` specifier is `"elsewhere"` and touches no
 * filesystem.
 *
 * Every way of failing to answer is a {@linkcode LocalTarget}, including a
 * `file:` specifier that will not parse as a URL: `binstruct "file://a b/x"`
 * used to escape as an uncaught `TypeError` and a stack trace, because the URL
 * was decoded outside the `try` that guards the `stat`.
 *
 * @param specifier A resolved specifier, e.g. `jsr:@binstruct/png` or a `file:` URL
 * @returns What is at the target, or `"elsewhere"` when it is not on this machine
 *
 * @example A module, a directory and a registry specifier
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { inspectLocalTarget } from "./target.ts";
 *
 * const module = await inspectLocalTarget(import.meta.resolve("./target.ts"));
 *
 * assertEquals(module.kind, "module");
 *
 * const directory = await inspectLocalTarget(import.meta.resolve("./"));
 *
 * assertEquals(directory.kind, "directory");
 * if (directory.kind === "directory") {
 *   assertEquals(directory.modules.includes("target.ts"), true);
 *   assertEquals(directory.modules.includes("deno.json"), false);
 * }
 *
 * assertEquals((await inspectLocalTarget("jsr:@binstruct/png")).kind, "elsewhere");
 * ```
 *
 * @example Nothing there at all
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { inspectLocalTarget } from "./target.ts";
 *
 * const missing = await inspectLocalTarget(
 *   import.meta.resolve("./no-such-module.ts"),
 * );
 *
 * assertEquals(missing.kind, "missing");
 * ```
 *
 * @example A `file:` specifier that is not a URL is refused, not thrown
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { inspectLocalTarget } from "./target.ts";
 *
 * const malformed = await inspectLocalTarget("file://a b/x");
 *
 * assertEquals(malformed.kind, "unreadable");
 * ```
 */
export async function inspectLocalTarget(
  specifier: string,
): Promise<LocalTarget> {
  if (!specifier.startsWith(FILE_SCHEME)) return { kind: "elsewhere" };

  let path: string;
  try {
    path = fromFileUrl(specifier);
  } catch (error) {
    return { kind: "unreadable", reason: reasonOf(error) };
  }

  let info: Deno.FileInfo;
  try {
    info = await Deno.stat(path);
  } catch (error) {
    return error instanceof Deno.errors.NotFound
      ? { kind: "missing" }
      : { kind: "unreadable", reason: reasonOf(error) };
  }

  if (!info.isDirectory) return { kind: "module" };

  try {
    return { kind: "directory", modules: await modulesInside(path) };
  } catch (error) {
    return { kind: "unreadable", reason: reasonOf(error) };
  }
}
