/**
 * A nested record field.
 *
 * @module
 */

import {
  type Decoded,
  decodeFields,
  type Fields,
  type OneField,
} from "./decode-fields.ts";

/**
 * A field that reads a record of fields from the element's children.
 *
 * @template F The fields.
 * @param fields The fields, keyed by element name.
 * @returns The field.
 *
 * @example Read a grid size
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { int } from "./int.ts";
 * import { obj } from "./obj.ts";
 *
 * const grid = obj({ rowGranularity: int(), columnGranularity: int() });
 *
 * assertEquals(
 *   grid.decode(parse("<Grid><rowGranularity>18</rowGranularity><columnGranularity>22</columnGranularity></Grid>").root),
 *   { rowGranularity: 18, columnGranularity: 22 },
 * );
 * ```
 */
export function obj<const F extends Fields>(fields: F): OneField<Decoded<F>> {
  return { decode: (element) => decodeFields(fields, element) };
}
