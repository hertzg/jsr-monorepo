/**
 * The wire fields every smart region and crossing line share.
 *
 * @module
 */

import { bool } from "../document/bool.ts";
import { int } from "../document/int.ts";
import { optional } from "../document/optional.ts";
import type { Point } from "../document/points.ts";
import { text } from "../document/text.ts";
import { tokens } from "../document/tokens.ts";

/**
 * What a region and a crossing line have in common.
 *
 * @example Describe a rule
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import type { SmartRule } from "./rule-fields.ts";
 *
 * const rule: SmartRule = {
 *   id: 1,
 *   enabled: true,
 *   coordinates: [{ x: 0, y: 0 }, { x: 1000, y: 1000 }],
 *   detectionTarget: ["human"],
 * };
 *
 * assertEquals(rule.detectionTarget, ["human"]);
 * ```
 */
export type SmartRule = {
  /** `<id>`, from 1. */
  id: number;
  /** `<enabled>`. */
  enabled: boolean;
  /** `<sensitivityLevel>`, 0 to 100. */
  sensitivityLevel?: number;
  /** The shape's points in the normalized screen space. */
  coordinates: Point[];
  /** `<detectionTarget>` split on commas, such as `["human", "vehicle"]`, or `["all"]` on some firmware. */
  detectionTarget: string[];
  /** `<alarmConfidence>`: `low`, `mediumLow`, `mediumHigh` or `high`. */
  alarmConfidence?: string;
};

/**
 * The wire fields every region and crossing line share.
 *
 * @example Describe a crossing line with them
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { document } from "../document/document.ts";
 * import { optional } from "../document/optional.ts";
 * import { text } from "../document/text.ts";
 * import { ruleFields } from "./rule-fields.ts";
 *
 * const line = document({ ...ruleFields, directionSensitivity: optional(text()) });
 *
 * assertEquals(
 *   line.parse("<LineItem><id>2</id><enabled>true</enabled><detectionTarget>human</detectionTarget></LineItem>"),
 *   { id: 2, enabled: true, detectionTarget: ["human"] },
 * );
 * ```
 */
export const ruleFields = {
  id: int(),
  enabled: optional(bool()),
  sensitivityLevel: optional(int()),
  detectionTarget: optional(tokens()),
  alarmConfidence: optional(text()),
};
