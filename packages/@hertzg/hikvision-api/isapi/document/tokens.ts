/**
 * A comma-separated list field.
 *
 * @module
 */

import type { OneField } from "./decode-fields.ts";
import { scalar } from "./scalar.ts";
import { splitTokens } from "./split-tokens.ts";

/**
 * A field that splits the element's text on commas into trimmed,
 * non-empty items, as `<detectionTarget>human,vehicle</detectionTarget>`
 * and `opt` attributes are written.
 *
 * @returns The field.
 *
 * @example Read detection targets
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { tokens } from "./tokens.ts";
 *
 * assertEquals(
 *   tokens().decode(parse("<detectionTarget>human, vehicle,</detectionTarget>").root),
 *   ["human", "vehicle"],
 * );
 * ```
 */
export function tokens(): OneField<string[]> {
  return scalar(splitTokens);
}
