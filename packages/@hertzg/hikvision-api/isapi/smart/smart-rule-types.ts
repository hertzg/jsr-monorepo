/**
 * The smart rule types by path segment and the alert event type each one posts.
 *
 * @module
 */

/**
 * The smart rule types by path segment, each mapped to the `<eventType>`
 * its alerts carry on the event stream.
 *
 * `FieldDetection` and `LineDetection` post all-lowercase event types; the
 * rest keep their camel case. Every type but `LineDetection` is a region
 * rule that `smartRules` reads.
 *
 * @example Match an alert to its rule type
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { SMART_RULE_TYPES } from "./smart-rule-types.ts";
 *
 * assertEquals(SMART_RULE_TYPES.FieldDetection, "fielddetection");
 * assertEquals(SMART_RULE_TYPES.regionEntrance, "regionEntrance");
 * ```
 */
export const SMART_RULE_TYPES = {
  FieldDetection: "fielddetection",
  LineDetection: "linedetection",
  regionEntrance: "regionEntrance",
  regionExiting: "regionExiting",
  loitering: "loitering",
  group: "group",
  rapidMove: "rapidMove",
  parking: "parking",
  unattendedBaggage: "unattendedBaggage",
  attendedBaggage: "attendedBaggage",
} as const;

/**
 * A region rule's path segment: every key of {@link SMART_RULE_TYPES} but `LineDetection`.
 *
 * @example Type a region rule's path segment
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import type { SmartRuleType } from "./smart-rule-types.ts";
 *
 * const type: SmartRuleType = "loitering";
 *
 * assertEquals(type, "loitering");
 * ```
 */
export type SmartRuleType = Exclude<
  keyof typeof SMART_RULE_TYPES,
  "LineDetection"
>;
