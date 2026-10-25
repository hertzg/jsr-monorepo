/**
 * Joins decoded smart rule fields with their points into a rule.
 *
 * @module
 */

import type { Decoded } from "../document/decode-fields.ts";
import type { Point } from "../document/points.ts";
import type { ruleFields, SmartRule } from "./rule-fields.ts";

/**
 * Joins decoded {@link ruleFields} with their points into a rule, defaulting
 * `enabled` to `false` and `detectionTarget` to `[]`.
 *
 * @template F The decoded fields, {@link ruleFields} plus any the caller adds.
 * @param fields The decoded fields; extra keys pass through.
 * @param coordinates The shape's points.
 * @returns The rule with its extra keys.
 *
 * @example Map a decoded line item
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { toRule } from "./to-rule.ts";
 *
 * const line = toRule(
 *   { id: 2, sensitivityLevel: 70, directionSensitivity: "any" },
 *   [{ x: 100, y: 500 }, { x: 900, y: 500 }],
 * );
 *
 * assertEquals(line, {
 *   id: 2,
 *   enabled: false,
 *   sensitivityLevel: 70,
 *   directionSensitivity: "any",
 *   coordinates: [{ x: 100, y: 500 }, { x: 900, y: 500 }],
 *   detectionTarget: [],
 * });
 * ```
 */
export function toRule<F extends Decoded<typeof ruleFields>>(
  fields: F,
  coordinates: Point[],
): F & SmartRule {
  // decodeFields leaves an absent optional field out entirely, so the
  // defaults survive the spread.
  return { enabled: false, detectionTarget: [], ...fields, coordinates };
}
