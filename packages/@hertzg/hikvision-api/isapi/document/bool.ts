/**
 * A boolean field.
 *
 * @module
 */

import type { OneField } from "./decode-fields.ts";
import { scalar } from "./scalar.ts";

/**
 * A field that reads `true` as `true` and anything else as `false`.
 *
 * @returns The field.
 *
 * @example Read an enabled flag
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { bool } from "./bool.ts";
 *
 * assertEquals(bool().decode(parse("<enabled>true</enabled>").root), true);
 * assertEquals(bool().decode(parse("<enabled>yes</enabled>").root), false);
 * ```
 */
export function bool(): OneField<boolean> {
  return scalar((value) => value === "true");
}
