/**
 * A field read from several optional attributes.
 *
 * @module
 */

import type { OneField } from "./decode-fields.ts";

/**
 * A field that reads the attributes named in `converters`, each converted,
 * leaving out the ones the element does not have. Capability ranges are
 * written this way: `<sensitivityLevel min="0" max="100">40</sensitivityLevel>`.
 *
 * @template C The converters, keyed by attribute name.
 * @param converters Turns each attribute's text into its value.
 * @returns The field.
 *
 * @example Read a range, step absent
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { attributes } from "./attributes.ts";
 *
 * const range = attributes({ min: Number, max: Number, step: Number });
 *
 * assertEquals(
 *   range.decode(parse('<sensitivityLevel min="0" max="100">40</sensitivityLevel>').root),
 *   { min: 0, max: 100 },
 * );
 * ```
 */
export function attributes<
  C extends Record<string, (value: string) => unknown>,
>(
  converters: C,
): OneField<{ [K in keyof C]?: ReturnType<C[K]> }> {
  return {
    decode: (element) => {
      const result: Record<string, unknown> = {};
      for (const [key, convert] of Object.entries(converters)) {
        const value = element.attributes[key];
        if (value !== undefined) {
          result[key] = convert(value);
        }
      }
      return result as { [K in keyof C]?: ReturnType<C[K]> };
    },
  };
}
