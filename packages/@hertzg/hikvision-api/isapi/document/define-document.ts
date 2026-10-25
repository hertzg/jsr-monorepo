/**
 * A document codec from a function of the root element.
 *
 * @module
 */

import type { XmlElement } from "@std/xml";
import { parseIsapi } from "../status/parse-isapi.ts";

/**
 * Reads one ISAPI document.
 *
 * @template T The decoded value.
 */
export type Document<T> = {
  /** Reads the value from the root element. */
  decode: (root: XmlElement) => T;
  /** Parses the text and reads the root; throws `IsapiError` on a failing `<ResponseStatus>`. */
  parse: (xml: string) => T;
  /** The same document with `transform` applied to what it reads. */
  map: <U>(transform: (value: T) => U) => Document<U>;
};

/**
 * A document read by a function of its root, for shapes a field record
 * cannot express, such as a list named after the root element.
 *
 * @template T The decoded value.
 * @param decode Reads the value from the root element.
 * @returns The document codec.
 *
 * @example A document whose list is named after its root
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { bool } from "./bool.ts";
 * import { children } from "./children.ts";
 * import { defineDocument } from "./define-document.ts";
 * import { int } from "./int.ts";
 * import { list } from "./list.ts";
 * import { obj } from "./obj.ts";
 *
 * const rules = defineDocument((root) => ({
 *   type: root.name.local,
 *   regions: list(`${root.name.local}Region`, obj({ id: int(), enabled: bool() }))
 *     .decodeAll(children(root, `${root.name.local}RegionList`)),
 * }));
 *
 * assertEquals(
 *   rules.parse("<Loitering><LoiteringRegionList><LoiteringRegion><id>1</id><enabled>true</enabled></LoiteringRegion></LoiteringRegionList></Loitering>"),
 *   { type: "Loitering", regions: [{ id: 1, enabled: true }] },
 * );
 * ```
 */
export function defineDocument<T>(
  decode: (root: XmlElement) => T,
): Document<T> {
  return {
    decode,
    parse: (xml) => decode(parseIsapi(xml)),
    map: (transform) => defineDocument((root) => transform(decode(root))),
  };
}
