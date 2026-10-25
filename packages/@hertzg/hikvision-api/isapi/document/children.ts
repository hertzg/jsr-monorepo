/**
 * The child elements of a parent with one local name.
 *
 * @module
 */

import { isElement, type XmlElement } from "@std/xml";

/**
 * The child elements of `parent` with local name `name`, in document order.
 * Namespaces and prefixes are ignored: `<ns:Item>` matches `Item`.
 *
 * @param parent The element to look under.
 * @param name The local name to match.
 * @returns The matching children; empty when there are none.
 *
 * @example Count repeated entries
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { children } from "./children.ts";
 *
 * const list = parse("<List><Item/><Other/><Item/></List>").root;
 *
 * assertEquals(children(list, "Item").length, 2);
 * assertEquals(children(list, "Missing"), []);
 * ```
 */
export function children(parent: XmlElement, name: string): XmlElement[] {
  return parent.children.filter(isElement).filter((node) =>
    node.name.local === name
  );
}
