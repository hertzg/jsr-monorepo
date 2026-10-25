/**
 * Splits a comma-separated ISAPI value.
 *
 * @module
 */

/**
 * Splits `value` on commas into trimmed, non-empty items, as
 * `<detectionTarget>human,vehicle</detectionTarget>` and `opt`
 * attributes are written.
 *
 * @param value The text.
 * @returns The items, in order.
 *
 * @example Trailing comma and spaces are dropped
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { splitTokens } from "./split-tokens.ts";
 *
 * assertEquals(splitTokens("human, vehicle,"), ["human", "vehicle"]);
 * assertEquals(splitTokens(""), []);
 * ```
 */
export function splitTokens(value: string): string[] {
  return value.split(",").map((token) => token.trim()).filter((token) =>
    token !== ""
  );
}
