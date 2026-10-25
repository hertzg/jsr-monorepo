/**
 * A field read from one attribute.
 *
 * @module
 */

import type { OneField } from "./decode-fields.ts";

/**
 * A field that reads one attribute of the element and converts it.
 * Capability documents put the choices in attributes:
 * `<regionType opt="grid,region">grid</regionType>`.
 *
 * @template T The decoded value.
 * @param name The attribute's name.
 * @param convert Turns the attribute's text into the value; identity by default.
 * @returns The field.
 * @throws {Error} On decode, when the element has no such attribute.
 *
 * @example Read a capability's choices
 * ```ts
 * import { assertEquals, assertThrows } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { attribute } from "./attribute.ts";
 *
 * const choices = attribute("opt", (value) => value.split(","));
 *
 * assertEquals(
 *   choices.decode(parse('<regionType opt="grid,region">grid</regionType>').root),
 *   ["grid", "region"],
 * );
 * assertThrows(
 *   () => choices.decode(parse("<regionType>grid</regionType>").root),
 *   Error,
 *   "ISAPI <regionType> has no opt attribute",
 * );
 * ```
 */
export function attribute<T = string>(
  name: string,
  convert: (value: string) => T = (value) => value as T,
): OneField<T> {
  return {
    decode: (element) => {
      const value = element.attributes[name];
      if (value === undefined) {
        throw new Error(
          `ISAPI <${element.name.local}> has no ${name} attribute`,
        );
      }
      return convert(value);
    },
  };
}
