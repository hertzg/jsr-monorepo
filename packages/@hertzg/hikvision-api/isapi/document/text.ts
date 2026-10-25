/**
 * A text field.
 *
 * @module
 */

import type { OneField } from "./decode-fields.ts";
import { scalar } from "./scalar.ts";

/**
 * A field that reads the element's text as is.
 *
 * @returns The field.
 *
 * @example Read a model name
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { text } from "./text.ts";
 *
 * assertEquals(text().decode(parse("<model>DS-7608NI-Q2/8P</model>").root), "DS-7608NI-Q2/8P");
 * ```
 */
export function text(): OneField<string> {
  return scalar((value) => value);
}
