/**
 * A field of the items under a wrapper element.
 *
 * @module
 */

import { children } from "./children.ts";
import type { ManyField, OneField } from "./decode-fields.ts";

/**
 * A field that reads the `itemName` children of the wrapper element with
 * `item`, the way ISAPI nests lists: `<RegionList><Region>…</Region>…`.
 * A missing wrapper means `[]`, which is also what a device means by it.
 *
 * @template T The decoded item.
 * @param itemName The local name of each item under the wrapper.
 * @param item Reads one item.
 * @returns The field.
 *
 * @example A present and a missing wrapper
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { decodeFields } from "./decode-fields.ts";
 * import { int } from "./int.ts";
 * import { list } from "./list.ts";
 * import { obj } from "./obj.ts";
 *
 * const fields = { RegionList: list("Region", obj({ id: int() })) };
 *
 * assertEquals(
 *   decodeFields(fields, parse("<Root><RegionList><Region><id>1</id></Region></RegionList></Root>").root),
 *   { RegionList: [{ id: 1 }] },
 * );
 * assertEquals(decodeFields(fields, parse("<Root/>").root), { RegionList: [] });
 * ```
 */
export function list<T>(itemName: string, item: OneField<T>): ManyField<T[]> {
  return {
    decodeAll: (wrappers) =>
      wrappers.flatMap((wrapper) =>
        children(wrapper, itemName).map((el) => item.decode(el))
      ),
  };
}
