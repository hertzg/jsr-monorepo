/**
 * A field made of one conversion of an element's text.
 *
 * @module
 */

import { isCData, isText, type XmlElement } from "@std/xml";
import type { OneField } from "./decode-fields.ts";

/**
 * A field that converts the element's text, its text and CDATA children
 * joined, with `convert`.
 *
 * @template T The decoded value.
 * @param convert Turns the text into the value; gets the element for error messages.
 * @returns The field.
 *
 * @example A field that upper-cases
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { scalar } from "./scalar.ts";
 *
 * const upper = scalar((text) => text.toUpperCase());
 *
 * assertEquals(upper.decode(parse("<a>nvr</a>").root), "NVR");
 * assertEquals(upper.decode(parse("<a><![CDATA[ip]]>c</a>").root), "IPC");
 * ```
 */
export function scalar<T>(
  convert: (text: string, element: XmlElement) => T,
): OneField<T> {
  return {
    decode: (element) => convert(textContent(element), element),
  };
}

function textContent(element: XmlElement): string {
  return element.children
    .filter((node) => isText(node) || isCData(node))
    .map((node) => node.text)
    .join("");
}
