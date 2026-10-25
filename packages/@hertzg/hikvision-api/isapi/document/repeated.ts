/**
 * A field of every element with one name.
 *
 * @module
 */

import type { ManyField, OneField } from "./decode-fields.ts";

/**
 * A field that reads every element of its name with `item`, for list
 * documents whose items sit right under the root:
 * `<InputProxyChannelList><InputProxyChannel>…</InputProxyChannel>…`.
 * No elements means `[]`.
 *
 * @template T The decoded item.
 * @param item Reads one element.
 * @returns The field.
 *
 * @example Read a list document's items
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { decodeFields } from "./decode-fields.ts";
 * import { int } from "./int.ts";
 * import { obj } from "./obj.ts";
 * import { repeated } from "./repeated.ts";
 *
 * const root = parse("<List><Item><id>1</id></Item><Other/><Item><id>2</id></Item></List>").root;
 *
 * assertEquals(
 *   decodeFields({ Item: repeated(obj({ id: int() })) }, root),
 *   { Item: [{ id: 1 }, { id: 2 }] },
 * );
 * assertEquals(decodeFields({ Item: repeated(int()) }, parse("<List/>").root), { Item: [] });
 * ```
 */
export function repeated<T>(item: OneField<T>): ManyField<T[]> {
  return { decodeAll: (elements) => elements.map((el) => item.decode(el)) };
}
