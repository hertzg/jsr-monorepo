/**
 * Package loader utilities for the Binary Structure CLI.
 *
 * This module provides utilities for loading coders from various package sources,
 * including JSR packages, local packages, and npm packages.
 *
 * @module
 */

import type { Coder } from "@hertzg/binstruct";

/**
 * Loads a coder from the specified package.
 *
 * @param packageSpec Package specifier (JSR URL, local path, or npm package)
 * @param coderName Name of the coder to use from the package
 * @returns The loaded coder function
 *
 * @example Loading a coder from a JSR package
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { loadCoder } from "./loader.ts";
 *
 * const coder = await loadCoder("jsr:@binstruct/png", "pngFile");
 * assertEquals(typeof coder.decode, "function");
 * assertEquals(typeof coder.encode, "function");
 * ```
 *
 * @example Loading a coder from a local package
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { loadCoder } from "./loader.ts";
 *
 * const coder = await loadCoder("./my-package", "myStruct");
 * assertEquals(typeof coder.decode, "function");
 * assertEquals(typeof coder.encode, "function");
 * ```
 *
 * @example Loading a coder from an npm package
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { loadCoder } from "./loader.ts";
 *
 * const coder = await loadCoder("npm:my-binary-package", "myCoder");
 * assertEquals(typeof coder.decode, "function");
 * assertEquals(typeof coder.encode, "function");
 * ```
 */
export async function loadCoder(
  packageSpec: string,
  coderName: string,
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
