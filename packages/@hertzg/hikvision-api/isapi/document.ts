/**
 * Describes an ISAPI document once; the description reads it.
 *
 * A document is a record of field codecs keyed by element name. Decoding
 * walks the record: each codec reads the child of that name, so the
 * description is also the list of elements the reader depends on:
 *
 * ```
 * document({ model: text(), deviceType: text(), serialNumber: optional(text()) })
 *   <DeviceInfo><model>X</model><deviceType>NVR</deviceType></DeviceInfo>
 *   -> { model: "X", deviceType: "NVR" }
 * ```
 *
 * A required field that is missing throws naming both elements. An
 * {@link optional} field is left out of the result instead. Elements the
 * description does not name are ignored, and names match by local name,
 * so `xmlns` never matters.
 *
 * @example Describe and read a document
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { bool, document, int, optional, text } from "./document.ts";
 *
 * const time = document({
 *   timeMode: text(),
 *   localTime: text(),
 *   platformType: optional(text()),
 * });
 *
 * assertEquals(
 *   time.parse("<Time><timeMode>NTP</timeMode><localTime>2026-10-22T11:33:52+04:00</localTime></Time>"),
 *   { timeMode: "NTP", localTime: "2026-10-22T11:33:52+04:00" },
 * );
 * ```
 *
 * @module
 */

import { isCData, isElement, isText, type XmlElement } from "@std/xml";
import { parseIsapi } from "./status.ts";

/**
 * Reads one field from the children of `parent` named `name`.
 *
 * @template T The decoded value.
 */
export type Field<T> = {
  /** Reads the value from the children of `parent` named `name`. */
  decode: (parent: XmlElement, name: string) => T;
  /** `true` when the field may be missing; set by {@link optional}. */
  optional?: boolean;
};

/** The decoded value of a {@link Field}. */
export type FieldValue<F> = F extends Field<infer T> ? T : never;

/** A record of field codecs keyed by element name. */
// `any`, not `unknown`: a Field<number> is not assignable to Field<unknown>.
// deno-lint-ignore no-explicit-any
export type Fields = Record<string, Field<any>>;

/** The keys of `F` marked {@link optional}. */
export type OptionalKeys<F extends Fields> = {
  [K in keyof F]: F[K] extends { optional: true } ? K : never;
}[keyof F];

/** The decoded object for `F`; {@link optional} fields may be absent. */
export type Decoded<F extends Fields> =
  & { [K in Exclude<keyof F, OptionalKeys<F>>]: FieldValue<F[K]> }
  & { [K in OptionalKeys<F>]?: FieldValue<F[K]> };

/** A point in a device's normalized 1000 x 1000 screen space. */
export type Point = {
  /** `<positionX>`, 0 at the left edge. */
  x: number;
  /** `<positionY>`, 0 at the top edge. */
  y: number;
};

/**
 * The child elements of `parent` with local name `name`, in document order.
 *
 * @param parent The element to look under.
 * @param name The local name to match.
 * @returns The matching children; empty when there are none.
 *
 * @example Count repeated entries
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { children } from "./document.ts";
 *
 * const list = parse("<List><Item/><Other/><Item/></List>").root;
 *
 * assertEquals(children(list, "Item").length, 2);
 * ```
 */
export function children(parent: XmlElement, name: string): XmlElement[] {
  return parent.children.filter(isElement).filter((node) =>
    node.name.local === name
  );
}

/**
 * The first child element of `parent` with local name `name`.
 *
 * @param parent The element to look under.
 * @param name The local name to match.
 * @returns The child, or `undefined` when there is none.
 *
 * @example Reach a nested element
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { child, textContent } from "./document.ts";
 *
 * const root = parse("<Grid><rows>18</rows></Grid>").root;
 *
 * assertEquals(textContent(child(root, "rows")!), "18");
 * assertEquals(child(root, "Missing"), undefined);
 * ```
 */
export function child(
  parent: XmlElement,
  name: string,
): XmlElement | undefined {
  return children(parent, name)[0];
}

/**
 * The text of `element`: its text and CDATA children joined.
 *
 * @param element The element to read.
 * @returns The text, `""` for an empty element.
 *
 * @example Read an element's text
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { textContent } from "./document.ts";
 *
 * assertEquals(textContent(parse("<model>DS-2CD2043G2-I</model>").root), "DS-2CD2043G2-I");
 * ```
 */
export function textContent(element: XmlElement): string {
  return element.children
    .filter((node) => isText(node) || isCData(node))
    .map((node) => node.text)
    .join("");
}

/**
 * Splits a comma-separated ISAPI list such as `human,vehicle`.
 *
 * @param value The list text.
 * @returns The trimmed, non-empty items; `[]` for `""`.
 *
 * @example Split detection targets
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { splitTokens } from "./document.ts";
 *
 * assertEquals(splitTokens("human, vehicle,"), ["human", "vehicle"]);
 * ```
 */
export function splitTokens(value: string): string[] {
  return value.split(",").map((token) => token.trim()).filter((token) =>
    token !== ""
  );
}

function require(parent: XmlElement, name: string): XmlElement {
  const found = child(parent, name);
  if (found === undefined) {
    throw new Error(`ISAPI <${parent.name.local}> has no <${name}>`);
  }
  return found;
}

function number(value: string, name: string): number {
  const parsed = Number(value);
  if (value.trim() === "" || Number.isNaN(parsed)) {
    throw new Error(`ISAPI <${name}> is not a number: "${value}"`);
  }
  return parsed;
}

function scalar<T>(convert: (value: string, name: string) => T): Field<T> {
  return {
    decode: (parent, name) => convert(textContent(require(parent, name)), name),
  };
}

/**
 * A text field, such as `<model>DS-7608NI-Q2/8P</model>`.
 *
 * @returns A field codec for a `string`.
 *
 * @example Read text
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { text } from "./document.ts";
 *
 * assertEquals(text().decode(parse("<p><model>X</model></p>").root, "model"), "X");
 * ```
 */
export function text(): Field<string> {
  return scalar((value) => value);
}

/**
 * A number field, such as `<channelID>7</channelID>`.
 *
 * @returns A field codec for a `number`.
 * @throws {Error} On read, when the text is not a number.
 *
 * @example Read a number
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { int } from "./document.ts";
 *
 * assertEquals(int().decode(parse("<p><id>7</id></p>").root, "id"), 7);
 * ```
 */
export function int(): Field<number> {
  return scalar(number);
}

/**
 * A boolean field: `true` for the text `true`, `false` for anything else.
 *
 * @returns A field codec for a `boolean`.
 *
 * @example Read a flag
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { bool } from "./document.ts";
 *
 * assertEquals(bool().decode(parse("<p><enabled>true</enabled></p>").root, "enabled"), true);
 * ```
 */
export function bool(): Field<boolean> {
  return scalar((value) => value === "true");
}

/**
 * A comma-separated list field, such as `<targetType>human,vehicle</targetType>`.
 *
 * @returns A field codec for a `string[]`.
 *
 * @example Read a list
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { tokens } from "./document.ts";
 *
 * const root = parse("<p><targetType>human,vehicle</targetType></p>").root;
 *
 * assertEquals(tokens().decode(root, "targetType"), ["human", "vehicle"]);
 * ```
 */
export function tokens(): Field<string[]> {
  return scalar(splitTokens);
}

/**
 * A coordinate list, such as `<RegionCoordinatesList>` or `<CoordinatesList>`,
 * whose children each hold `<positionX>` and `<positionY>`.
 *
 * @returns A field codec for a `Point[]`; `[]` for an empty list.
 *
 * @example Read a line's two ends
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { points } from "./document.ts";
 *
 * const root = parse(
 *   "<Line><CoordinatesList>" +
 *     "<Coordinates><positionX>826</positionX><positionY>767</positionY></Coordinates>" +
 *     "<Coordinates><positionX>880</positionX><positionY>762</positionY></Coordinates>" +
 *     "</CoordinatesList></Line>",
 * ).root;
 *
 * assertEquals(points().decode(root, "CoordinatesList"), [{ x: 826, y: 767 }, { x: 880, y: 762 }]);
 * ```
 */
export function points(): Field<Point[]> {
  const pair = obj({ positionX: int(), positionY: int() });
  return {
    decode: (parent, name) =>
      require(parent, name).children.filter(isElement).map((element) => {
        const { positionX, positionY } = pair.decode(
          { ...parent, children: [element] },
          element.name.local,
        );
        return { x: positionX, y: positionY };
      }),
  };
}

/**
 * One attribute of the child element, such as `opt` of
 * `<regionType opt="grid,region">`.
 *
 * @param attribute The attribute name.
 * @param convert Turns the attribute text into the value; identity by default.
 * @returns A field codec for the converted value.
 * @throws {Error} On read, when the child has no such attribute.
 *
 * @example Read the options a capabilities document lists
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { attribute, splitTokens } from "./document.ts";
 *
 * const root = parse('<Cap><regionType opt="grid,region">grid</regionType></Cap>').root;
 *
 * assertEquals(attribute("opt", splitTokens).decode(root, "regionType"), ["grid", "region"]);
 * ```
 */
export function attribute<T = string>(
  attribute: string,
  convert: (value: string) => T = (value) => value as T,
): Field<T> {
  return {
    decode: (parent, name) => {
      const value = require(parent, name).attributes[attribute];
      if (value === undefined) {
        throw new Error(`ISAPI <${name}> has no ${attribute} attribute`);
      }
      return convert(value);
    },
  };
}

/**
 * Several attributes of the child element at once, such as `min`, `max` and
 * `step` of `<sensitivityLevel min="0" max="100" step="20">`.
 *
 * @param converters The attribute names with their converters.
 * @returns A field codec for an object with one optional key per attribute.
 *
 * @example Read a range
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { attributes } from "./document.ts";
 *
 * const root = parse('<Cap><sensitivityLevel min="0" max="100">40</sensitivityLevel></Cap>').root;
 * const range = attributes({ min: Number, max: Number, step: Number });
 *
 * assertEquals(range.decode(root, "sensitivityLevel"), { min: 0, max: 100 });
 * ```
 */
export function attributes<
  C extends Record<string, (value: string) => unknown>,
>(
  converters: C,
): Field<{ [K in keyof C]?: ReturnType<C[K]> }> {
  return {
    decode: (parent, name) => {
      const element = require(parent, name);
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

/**
 * A nested element with fields of its own.
 *
 * @param fields The nested element's field codecs.
 * @returns A field codec for the nested object.
 *
 * @example Read a nested element
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { int, obj } from "./document.ts";
 *
 * const grid = obj({ rowGranularity: int(), columnGranularity: int() });
 * const root = parse("<M><Grid><rowGranularity>18</rowGranularity><columnGranularity>22</columnGranularity></Grid></M>").root;
 *
 * assertEquals(grid.decode(root, "Grid"), { rowGranularity: 18, columnGranularity: 22 });
 * ```
 */
export function obj<const F extends Fields>(fields: F): Field<Decoded<F>> {
  return {
    decode: (parent, name) => decodeFields(fields, require(parent, name)),
  };
}

/**
 * Elements repeated directly under the parent, such as several
 * `<InputProxyChannel>` inside `<InputProxyChannelList>`.
 *
 * @param item The codec for one element.
 * @returns A field codec for an array; `[]` when there are none.
 *
 * @example Read repeated elements
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { int, obj, repeated } from "./document.ts";
 *
 * const root = parse("<List><Item><id>1</id></Item><Item><id>2</id></Item></List>").root;
 *
 * assertEquals(repeated(obj({ id: int() })).decode(root, "Item"), [{ id: 1 }, { id: 2 }]);
 * ```
 */
export function repeated<T>(item: Field<T>): Field<T[]> {
  return {
    decode: (parent, name) =>
      children(parent, name).map((element) =>
        item.decode({ ...parent, children: [element] }, name)
      ),
  };
}

/**
 * A wrapper element holding repeated items, such as
 * `<FieldDetectionRegionList>` of `<FieldDetectionRegion>`.
 *
 * @param itemName The element name of one item.
 * @param item The codec for one item.
 * @returns A field codec for an array; `[]` when the wrapper is missing or empty.
 *
 * @example Read a wrapped list
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { int, list, obj } from "./document.ts";
 *
 * const root = parse("<R><RegionList><Region><id>1</id></Region></RegionList></R>").root;
 *
 * assertEquals(list("Region", obj({ id: int() })).decode(root, "RegionList"), [{ id: 1 }]);
 * assertEquals(list("Region", obj({ id: int() })).decode(root, "Missing"), []);
 * ```
 */
export function list<T>(itemName: string, item: Field<T>): Field<T[]> {
  const items = repeated(item);
  return {
    decode: (parent, name) => {
      const wrapper = child(parent, name);
      return wrapper === undefined ? [] : items.decode(wrapper, itemName);
    },
  };
}

/**
 * Marks a field as possibly missing: it is left out of the result instead
 * of throwing.
 *
 * @param field The field codec.
 * @returns The same codec, marked optional.
 *
 * @example Read a missing optional field
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { document, optional, text } from "./document.ts";
 *
 * const info = document({ model: text(), serialNumber: optional(text()) });
 *
 * assertEquals(info.parse("<DeviceInfo><model>X</model></DeviceInfo>"), { model: "X" });
 * ```
 */
export function optional<T>(field: Field<T>): Field<T> & { optional: true } {
  return { ...field, optional: true };
}

/**
 * Reads `fields` from the children of `element`.
 *
 * @param fields The field codecs, keyed by element name.
 * @param element The element whose children to read.
 * @returns The decoded object.
 *
 * @example Decode a dynamically named list
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { bool, decodeFields } from "./document.ts";
 *
 * const root = parse("<Loitering><enabled>true</enabled></Loitering>").root;
 *
 * assertEquals(decodeFields({ enabled: bool() }, root), { enabled: true });
 * ```
 */
export function decodeFields<F extends Fields>(
  fields: F,
  element: XmlElement,
): Decoded<F> {
  const value: Record<string, unknown> = {};
  for (const [name, field] of Object.entries(fields)) {
    if (field.optional && child(element, name) === undefined) {
      continue;
    }
    value[name] = field.decode(element, name);
  }
  return value as Decoded<F>;
}

/**
 * A whole ISAPI document: its root's fields, readable from an element or
 * from text.
 *
 * @template T The decoded value.
 */
export type Document<T> = {
  /** Reads the fields of `root`. */
  decode: (root: XmlElement) => T;
  /** Parses the text and reads the root; throws {@link IsapiError} on a failing `<ResponseStatus>`. */
  parse: (xml: string) => T;
};

/**
 * Describes a document by its root's fields.
 *
 * @param fields The field codecs, keyed by element name.
 * @returns The document codec.
 *
 * @example Describe a list document
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { document, int, repeated, obj, text } from "./document.ts";
 *
 * const channels = document({
 *   InputProxyChannel: repeated(obj({ id: int(), name: text() })),
 * });
 *
 * assertEquals(
 *   channels.parse(
 *     "<InputProxyChannelList><InputProxyChannel><id>1</id><name>Camera 01</name>" +
 *       "</InputProxyChannel></InputProxyChannelList>",
 *   ),
 *   { InputProxyChannel: [{ id: 1, name: "Camera 01" }] },
 * );
 * ```
 */
export function document<const F extends Fields>(
  fields: F,
): Document<Decoded<F>> {
  const decode = (root: XmlElement) => decodeFields(fields, root);
  return { decode, parse: (xml) => decode(parseIsapi(xml)) };
}
