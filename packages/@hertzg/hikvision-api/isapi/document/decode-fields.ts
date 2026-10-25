/**
 * The field contract and the one loop that reads a record of fields.
 *
 * A field reads an element; it never looks one up. {@link decodeFields}
 * finds the children by name and decides what a missing one means:
 *
 * ```
 * OneField   exactly one child: decode(child); none throws, or the key
 *            is left out when the field is optional
 * ManyField  every child of the name: decodeAll(children); none is fine
 * ```
 *
 * @example Read a record of fields from a root
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { bool } from "./bool.ts";
 * import { decodeFields } from "./decode-fields.ts";
 * import { optional } from "./optional.ts";
 * import { text } from "./text.ts";
 *
 * const root = parse("<Channel7><name>Camera 07</name><enabled>true</enabled></Channel7>").root;
 *
 * assertEquals(
 *   decodeFields({ name: text(), enabled: bool(), model: optional(text()) }, root),
 *   { name: "Camera 07", enabled: true },
 * );
 * ```
 *
 * @module
 */

import type { XmlElement } from "@std/xml";
import { children } from "./children.ts";

/**
 * A field that reads exactly one element.
 *
 * @template T The decoded value.
 */
export type OneField<T> = {
  /** Reads the value from the element. */
  decode: (element: XmlElement) => T;
  /** `true` when the element may be missing; set by `optional()`. */
  optional?: boolean;
};

/**
 * A field that reads every element of its name, zero included.
 *
 * @template T The decoded value.
 */
export type ManyField<T> = {
  /** Reads the value from the elements, in document order. */
  decodeAll: (elements: XmlElement[]) => T;
};

/**
 * Any field.
 *
 * @template T The decoded value.
 */
export type Field<T> = OneField<T> | ManyField<T>;

/** The decoded value of a {@link Field}. */
export type FieldValue<F> = F extends Field<infer T> ? T : never;

/** A record of fields keyed by element name. */
// `any`, not `unknown`: a Field<number> is not assignable to Field<unknown>.
// deno-lint-ignore no-explicit-any
export type Fields = Record<string, Field<any>>;

/** The keys of `F` marked optional. */
export type OptionalKeys<F extends Fields> = {
  [K in keyof F]: F[K] extends { optional: true } ? K : never;
}[keyof F];

/** The decoded object for `F`; optional fields may be absent. */
export type Decoded<F extends Fields> =
  & { [K in Exclude<keyof F, OptionalKeys<F>>]: FieldValue<F[K]> }
  & { [K in OptionalKeys<F>]?: FieldValue<F[K]> };

/**
 * Reads every field of `fields` from the children of `element`.
 *
 * @template F The fields.
 * @param fields The fields, keyed by element name.
 * @param element The element whose children hold them.
 * @returns The decoded object, without keys for absent optional fields.
 * @throws {Error} When a required field has no element, naming both.
 *
 * @example A required field that is missing names parent and child
 * ```ts
 * import { assertThrows } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { decodeFields } from "./decode-fields.ts";
 * import { text } from "./text.ts";
 *
 * const root = parse("<DeviceInfo><model>X</model></DeviceInfo>").root;
 *
 * assertThrows(
 *   () => decodeFields({ serialNumber: text() }, root),
 *   Error,
 *   "ISAPI <DeviceInfo> has no <serialNumber>",
 * );
 * ```
 */
export function decodeFields<F extends Fields>(
  fields: F,
  element: XmlElement,
): Decoded<F> {
  const value: Record<string, unknown> = {};
  for (const [name, field] of Object.entries(fields)) {
    const found = children(element, name);
    if ("decodeAll" in field) {
      value[name] = field.decodeAll(found);
    } else if (found.length > 0) {
      value[name] = field.decode(found[0]);
    } else if (!field.optional) {
      throw new Error(`ISAPI <${element.name.local}> has no <${name}>`);
    }
  }
  return value as Decoded<F>;
}
