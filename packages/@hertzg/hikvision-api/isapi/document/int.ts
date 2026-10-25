/**
 * A number field.
 *
 * @module
 */

import type { OneField } from "./decode-fields.ts";
import { scalar } from "./scalar.ts";

/**
 * A field that reads the element's text as a number.
 *
 * @returns The field.
 * @throws {Error} On decode, when the text is not a number, naming the element.
 *
 * @example Read a channel id
 * ```ts
 * import { assertEquals, assertThrows } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { int } from "./int.ts";
 *
 * assertEquals(int().decode(parse("<channelID>7</channelID>").root), 7);
 * assertThrows(
 *   () => int().decode(parse("<channelID>seven</channelID>").root),
 *   Error,
 *   'ISAPI <channelID> is not a number: "seven"',
 * );
 * ```
 */
export function int(): OneField<number> {
  return scalar((value, element) => {
    const parsed = Number(value);
    if (value.trim() === "" || Number.isNaN(parsed)) {
      throw new Error(
        `ISAPI <${element.name.local}> is not a number: "${value}"`,
      );
    }
    return parsed;
  });
}
