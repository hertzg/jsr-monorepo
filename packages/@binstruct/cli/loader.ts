/**
 * Package loader utilities for the Binary Structure CLI.
 *
 * This module provides utilities for loading coders from various package sources,
 * including JSR packages, local packages, and npm packages.
 *
 * This is also the last place a coder factory can be stopped before it runs, so
 * it is where the arity guarantee is enforced: a factory is called with no
 * arguments, and calling one that wanted some lets the argument default
 * silently. Discovery normally settles the question from the declaration
 * (`./discover.ts`, ADR 0002); when it could not, {@linkcode loadCoder} falls
 * back to `Function.prototype.length` and refuses rather than guess.
 *
 * @module
 */

import type { Coder } from "@hertzg/binstruct";

/**
 * What the caller already knows about the factory it is asking for.
 */
export type LoadCoderOptions = {
  /**
   * Whether the factory's parameter list has been read from its declaration.
   *
   * Defaults to `false`, which is the safe direction: an unverified factory is
   * checked against its runtime arity before it is called, and refused when
   * that arity is non-zero. Pass `true` only with a declaration-level count in
   * hand — that count is the more accurate of the two, since it can tell an
   * optional parameter from a required one and `.length` cannot.
   */
  readonly arityVerified?: boolean;
};

/**
 * Refusal to call a factory whose parameter list nothing has vouched for.
 *
 * Raised by {@linkcode loadCoder} when the factory reports a non-zero
 * `Function.prototype.length` and the caller did not set
 * {@linkcode LoadCoderOptions.arityVerified}. The CLI has no way to supply an
 * argument, so the alternative is calling `pcapFileWith()` with no sub-coders
 * at all — `undefined` where a header coder belongs, and a failure somewhere
 * inside the decode rather than here.
 *
 * `.length` is a coarser instrument than the declaration: TypeScript erases the
 * `?` of an optional parameter, so `f(x?: T)` reports an arity of 1 and is
 * refused here even though calling it bare is exactly what its author intended.
 * That is the safe direction to be wrong in, and the CLI says so on the screen
 * it prints — a defaulted parameter (`x = v`) and a rest tail are the two forms
 * that do drop out of the count.
 *
 * @example A factory taking an argument is not called
 * ```ts
 * import { assertEquals, assertRejects } from "@std/assert";
 * import { loadCoder, UnverifiedArityError } from "./loader.ts";
 *
 * const error = await assertRejects(
 *   () => loadCoder(import.meta.resolve("../pcap/mod.ts"), "pcapFileWith"),
 *   UnverifiedArityError,
 * );
 *
 * assertEquals(error.coderName, "pcapFileWith");
 * assertEquals(error.arity, 2);
 * ```
 */
export class UnverifiedArityError extends Error {
  /** The specifier the factory was imported from. */
  readonly packageSpec: string;
  /** The factory that was not called. */
  readonly coderName: string;
  /** Its `Function.prototype.length`, always one or more. */
  readonly arity: number;

  /**
   * @param packageSpec The specifier the factory was imported from
   * @param coderName The factory that was not called
   * @param arity Its `Function.prototype.length`
   */
  constructor(packageSpec: string, coderName: string, arity: number) {
    super(
      `'${coderName}' in '${packageSpec}' declares ${arity} parameter${
        arity === 1 ? "" : "s"
      }, and its declaration could not be read to say whether they are required, so it was not called`,
    );
    this.name = "UnverifiedArityError";
    this.packageSpec = packageSpec;
    this.coderName = coderName;
    this.arity = arity;
  }
}

/**
 * Loads a coder from the specified package.
 *
 * `packageSpec` is forwarded to dynamic `import()`, so any specifier the
 * runtime accepts works — `jsr:@scope/pkg`, `npm:pkg`, an absolute URL,
 * or a local path. The package must export `coderName` as a function
 * returning a coder (an object with `encode` and `decode`).
 *
 * The factory is called with no arguments, so one that takes any is refused
 * with an {@linkcode UnverifiedArityError} unless the caller has already read
 * its declaration and says so through
 * {@linkcode LoadCoderOptions.arityVerified}.
 *
 * @param packageSpec Package specifier (JSR URL, npm package, or local path)
 * @param coderName Name of the coder factory to import
 * @param options What the caller already knows about the factory
 * @returns The coder instance
 *
 * @example Load a coder from a JSR package
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { loadCoder } from "./loader.ts";
 *
 * const coder = await loadCoder("jsr:@binstruct/png", "pngFile");
 * assertEquals(typeof coder.decode, "function");
 * assertEquals(typeof coder.encode, "function");
 * ```
 *
 * @example A declaration-level count overrules the runtime arity
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { loadCoder } from "./loader.ts";
 *
 * const coder = await loadCoder(
 *   "data:text/javascript,export const optional = (x) => ({ decode: () => [x, 0], encode: () => 0 });",
 *   "optional",
 *   { arityVerified: true },
 * );
 *
 * assertEquals(typeof coder.decode, "function");
 * ```
 */
export async function loadCoder(
  packageSpec: string,
  coderName: string,
  options: LoadCoderOptions = {},
): Promise<Coder<unknown>> {
  try {
    // Import the package
    const pkg = await import(packageSpec);

    // Get the coder function
    const coder = pkg[coderName];

    if (!coder) {
      throw new Error(
        `Coder '${coderName}' not found in package '${packageSpec}'. Available exports: ${
          Object.keys(pkg).join(", ")
        }`,
      );
    }

    if (typeof coder !== "function") {
      throw new Error(
        `Export '${coderName}' from package '${packageSpec}' is not a function`,
      );
    }

    if (options.arityVerified !== true && coder.length > 0) {
      throw new UnverifiedArityError(packageSpec, coderName, coder.length);
    }

    // Call the coder function to get the actual coder
    const coderInstance = coder();

    if (!coderInstance || typeof coderInstance.decode !== "function") {
      throw new Error(
        `Coder '${coderName}' from package '${packageSpec}' does not return a valid coder instance`,
      );
    }

    return coderInstance;
  } catch (error) {
    if (
      error instanceof TypeError && error.message.includes("Failed to fetch")
    ) {
      throw new Error(
        `Failed to load package '${packageSpec}'. Make sure the package exists and is accessible.`,
      );
    }
    throw error;
  }
}
