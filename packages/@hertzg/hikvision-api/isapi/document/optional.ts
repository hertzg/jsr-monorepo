/**
 * Marks a field as one the device may leave out.
 *
 * @module
 */

import type { OneField } from "./decode-fields.ts";

/**
 * The same field, marked optional: when its element is absent the key is
 * left out of the decoded object instead of throwing. An element that is
 * present but empty, with no text, children or attributes, counts as
 * absent too: an AcuSense camera posts `<regionID></regionID>`, and an
 * `optional(int())` must not take the alert stream down over it.
 * Firmwares differ in which elements they send, so most fields are.
 *
 * @template T The decoded value.
 * @param field The field.
 * @returns The field, marked.
 *
 * @example An absent optional field has no key
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { decodeFields } from "./decode-fields.ts";
 * import { optional } from "./optional.ts";
 * import { text } from "./text.ts";
 *
 * const root = parse("<DeviceInfo><model>X</model></DeviceInfo>").root;
 *
 * const info = decodeFields({ model: text(), serialNumber: optional(text()) }, root);
 *
 * assertEquals(info, { model: "X" });
 * assertEquals("serialNumber" in info, false);
 * ```
 */
export function optional<T>(
  field: OneField<T>,
): OneField<T> & { optional: true } {
  return { ...field, optional: true };
}
