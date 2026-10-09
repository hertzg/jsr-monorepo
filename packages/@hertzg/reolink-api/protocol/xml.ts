/**
 * Typed XML codecs for Baichuan parameters.
 *
 * Every Baichuan body is a `<body>` holding one element per parameter, such
 * as `<RtspPort version="1.1">`. A parameter is described once, with field
 * codecs, and that description both builds request XML and reads reply XML:
 *
 * ```
 * xmlParam("RtspPort", { rtspPort: int(), enable: int() })
 *   encode  { rtspPort: 554, enable: 1 }  ->  <RtspPort version="1.1"><rtspPort>554</rtspPort>...
 *   decode  <RtspPort>...</RtspPort>      ->  { rtspPort: 554, enable: 1 }
 * ```
 *
 * Field codecs: {@link int}, {@link uint}, {@link u64}, {@link float},
 * {@link text}, {@link oneOf}, {@link obj}, {@link list}, {@link repeated}
 * and {@link optional}. Fields are written in declaration order. Reading
 * ignores elements the description does not name and throws on a missing
 * field that is not {@link optional}.
 *
 * @example Describe a parameter and round-trip it
 * ```ts
 * import { assertEquals, assertStringIncludes } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { int, xmlParam } from "@hertzg/reolink-api/protocol/xml";
 *
 * const rtspPort = xmlParam("RtspPort", { rtspPort: int(), enable: int() });
 *
 * const xml = rtspPort.encode({ rtspPort: 554, enable: 1 });
 * assertStringIncludes(xml, "<rtspPort>554</rtspPort>");
 * assertEquals(rtspPort.decode(parse(xml).root), { rtspPort: 554, enable: 1 });
 * ```
 *
 * @module
 */

import { isElement, isText, type XmlElement } from "@std/xml";

/**
 * Reads and writes one XML field: an element's text, a nested element, or a
 * run of repeated elements.
 *
 * @template T The decoded value.
 */
export type XmlField<T> = {
  /** Writes `value` as elements named `name`. */
  encode: (name: string, value: T) => string;
  /** Reads the value from the children of `parent` named `name`. */
  decode: (name: string, parent: XmlElement) => T;
  /** `true` when the field may be missing; set by {@link optional}. */
  optional?: boolean;
};

/** The decoded value of an {@link XmlField}. */
export type XmlFieldValue<F> = F extends XmlField<infer T> ? T : never;

/** A record of named field codecs, as passed to {@link obj} and {@link xmlParam}. */
// `any`, not `unknown`: `encode` takes the value, so a field of `number` is
// not assignable to a field of `unknown`.
// deno-lint-ignore no-explicit-any
export type XmlFields = Record<string, XmlField<any>>;

/** The keys of `F` whose codecs are marked {@link optional}. */
export type OptionalKeys<F extends XmlFields> = {
  [K in keyof F]: F[K] extends { optional: true } ? K : never;
}[keyof F];

/** The decoded object for a record of field codecs; {@link optional} fields may be absent. */
export type XmlFieldsValue<F extends XmlFields> =
  & { [K in Exclude<keyof F, OptionalKeys<F>>]: XmlFieldValue<F[K]> }
  & { [K in OptionalKeys<F>]?: XmlFieldValue<F[K]> };

function escape(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function children(parent: XmlElement, name: string): XmlElement[] {
  return parent.children.filter(isElement).filter((child) =>
    child.name.local === name
  );
}

function child(parent: XmlElement, name: string): XmlElement {
  const [found] = children(parent, name);
  if (found === undefined) {
    throw new Error(`Baichuan XML <${parent.name.local}> has no <${name}>`);
  }
  return found;
}

function textOf(element: XmlElement): string {
  return element.children.filter(isText).map((node) => node.text).join("");
}

function scalar<T>(
  write: (value: T) => string,
  read: (text: string, name: string) => T,
): XmlField<T> {
  return {
    encode: (name, value) => `<${name}>${escape(write(value))}</${name}>`,
    decode: (name, parent) => read(textOf(child(parent, name)), name),
  };
}

function number(text: string, name: string): number {
  const value = Number(text);
  if (text.trim() === "" || Number.isNaN(value)) {
    throw new Error(`Baichuan XML <${name}> is not a number: "${text}"`);
  }
  return value;
}

/**
 * A signed integer field, such as `<channelId>0</channelId>`.
 *
 * @returns A field codec for a `number`.
 *
 * @example Read an integer
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { int } from "@hertzg/reolink-api/protocol/xml";
 *
 * assertEquals(int().decode("speed", parse("<p><speed>-3</speed></p>").root), -3);
 * ```
 */
export function int(): XmlField<number> {
  return scalar((value) => String(Math.trunc(value)), number);
}

/**
 * An unsigned 32-bit integer field.
 *
 * @returns A field codec for a `number`.
 *
 * @example Write an unsigned integer
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { uint } from "@hertzg/reolink-api/protocol/xml";
 *
 * assertEquals(uint().encode("size", 4294967295), "<size>4294967295</size>");
 * ```
 */
export function uint(): XmlField<number> {
  return scalar((value) => String(Math.trunc(value)), number);
}

/**
 * An unsigned 64-bit integer field, read as a `bigint` so no digit is lost.
 *
 * @returns A field codec for a `bigint`.
 *
 * @example Read a 64-bit size
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { u64 } from "@hertzg/reolink-api/protocol/xml";
 *
 * const parent = parse("<p><size>18446744073709551615</size></p>").root;
 *
 * assertEquals(u64().decode("size", parent), 18446744073709551615n);
 * ```
 */
export function u64(): XmlField<bigint> {
  return scalar((value) => value.toString(), (text, name) => {
    try {
      return BigInt(text.trim());
    } catch {
      throw new Error(`Baichuan XML <${name}> is not an integer: "${text}"`);
    }
  });
}

/**
 * A floating point field.
 *
 * @returns A field codec for a `number`.
 *
 * @example Read a float
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { float } from "@hertzg/reolink-api/protocol/xml";
 *
 * assertEquals(float().decode("gain", parse("<p><gain>1.5</gain></p>").root), 1.5);
 * ```
 */
export function float(): XmlField<number> {
  return scalar(String, number);
}

/**
 * A text field, such as `<name>Front door</name>`. XML entities are escaped
 * on write and unescaped on read.
 *
 * @returns A field codec for a `string`.
 *
 * @example Round-trip text with an ampersand
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { text } from "@hertzg/reolink-api/protocol/xml";
 *
 * const xml = text().encode("name", "Tom & Jerry");
 *
 * assertEquals(xml, "<name>Tom &amp; Jerry</name>");
 * assertEquals(text().decode("name", parse(`<p>${xml}</p>`).root), "Tom & Jerry");
 * ```
 */
export function text(): XmlField<string> {
  return scalar((value) => value, (value) => value);
}

/**
 * A text field limited to known values, such as `<parity>none</parity>`.
 *
 * Reading throws on a value outside the list, so a firmware that sends
 * something new fails loudly instead of slipping past the type.
 *
 * @param values The accepted values.
 * @returns A field codec for the union of `values`.
 *
 * @example Read an enumerated value
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { oneOf } from "@hertzg/reolink-api/protocol/xml";
 *
 * const parity = oneOf("none", "odd", "even");
 *
 * assertEquals(parity.decode("parity", parse("<p><parity>odd</parity></p>").root), "odd");
 * ```
 */
export function oneOf<const V extends string>(
  ...values: V[]
): XmlField<V> {
  return scalar((value) => value, (value, name) => {
    if (!(values as string[]).includes(value)) {
      throw new Error(
        `Baichuan XML <${name}> is "${value}", expected one of ${
          values.join(", ")
        }`,
      );
    }
    return value as V;
  });
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
 * import { int, obj } from "@hertzg/reolink-api/protocol/xml";
 *
 * const range = obj({ min: int(), max: int() });
 * const parent = parse("<p><speed><min>1</min><max>64</max></speed></p>").root;
 *
 * assertEquals(range.decode("speed", parent), { min: 1, max: 64 });
 * ```
 */
export function obj<const F extends XmlFields>(
  fields: F,
): XmlField<XmlFieldsValue<F>> {
  return {
    encode: (name, value) =>
      `<${name}>${encodeFields(fields, value)}</${name}>`,
    decode: (name, parent) => decodeFields(fields, child(parent, name)),
  };
}

/**
 * Elements repeated directly under the parent, such as several
 * `<AlarmEvent>` inside `<AlarmEventList>`. Missing elements read as `[]`.
 *
 * @param item The codec for one element.
 * @returns A field codec for an array.
 *
 * @example Read repeated elements
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { int, obj, repeated } from "@hertzg/reolink-api/protocol/xml";
 *
 * const events = repeated(obj({ channelId: int() }));
 * const parent = parse(
 *   "<list><event><channelId>0</channelId></event><event><channelId>1</channelId></event></list>",
 * ).root;
 *
 * assertEquals(events.decode("event", parent), [{ channelId: 0 }, { channelId: 1 }]);
 * ```
 */
export function repeated<T>(item: XmlField<T>): XmlField<T[]> {
  return {
    encode: (name, values) =>
      values.map((value) => item.encode(name, value)).join(""),
    decode: (name, parent) =>
      children(parent, name).map((element) => {
        const wrapper: XmlElement = { ...parent, children: [element] };
        return item.decode(name, wrapper);
      }),
  };
}

/**
 * A wrapper element holding repeated items, such as
 * `<presetList><preset>…</preset><preset>…</preset></presetList>`.
 *
 * @param itemName The element name of one item.
 * @param item The codec for one item.
 * @returns A field codec for an array.
 *
 * @example Read a wrapped list
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { int, list, obj } from "@hertzg/reolink-api/protocol/xml";
 *
 * const presets = list("preset", obj({ id: int() }));
 * const parent = parse(
 *   "<p><presetList><preset><id>1</id></preset><preset><id>2</id></preset></presetList></p>",
 * ).root;
 *
 * assertEquals(presets.decode("presetList", parent), [{ id: 1 }, { id: 2 }]);
 * ```
 */
export function list<T>(itemName: string, item: XmlField<T>): XmlField<T[]> {
  const items = repeated(item);
  return {
    encode: (name, values) =>
      `<${name}>${items.encode(itemName, values)}</${name}>`,
    decode: (name, parent) => items.decode(itemName, child(parent, name)),
  };
}

/**
 * Marks a field as possibly missing: it reads as absent instead of throwing,
 * and is not written when absent.
 *
 * @param field The field codec.
 * @returns The same codec, marked optional.
 *
 * @example Read a missing optional field
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { int, optional, xmlParam } from "@hertzg/reolink-api/protocol/xml";
 *
 * const port = xmlParam("RtmpPort", { rtmpPort: int(), enable: optional(int()) });
 * const root = parse("<RtmpPort><rtmpPort>1935</rtmpPort></RtmpPort>").root;
 *
 * assertEquals(port.decode(root), { rtmpPort: 1935 });
 * ```
 */
export function optional<T>(
  field: XmlField<T>,
): XmlField<T> & { optional: true } {
  return { ...field, optional: true };
}

function encodeFields<F extends XmlFields>(
  fields: F,
  value: XmlFieldsValue<F>,
): string {
  const values = value as Record<string, unknown>;
  return Object.entries(fields)
    .filter(([name, field]) => !(field.optional && values[name] === undefined))
    .map(([name, field]) => field.encode(name, values[name]))
    .join("");
}

function decodeFields<F extends XmlFields>(
  fields: F,
  element: XmlElement,
): XmlFieldsValue<F> {
  const value: Record<string, unknown> = {};
  for (const [name, field] of Object.entries(fields)) {
    if (field.optional && children(element, name).length === 0) {
      continue;
    }
    value[name] = field.decode(name, element);
  }
  return value as XmlFieldsValue<F>;
}

/**
 * A Baichuan parameter: a named top-level element of `<body>`.
 *
 * Exported codecs are annotated with their value type, which keeps the
 * public API explicit and makes the compiler check the field codecs against
 * it:
 *
 * ```ts ignore
 * export type RtspPort = { rtspPort: number; enable: number };
 * export const rtspPort: XmlParam<"RtspPort", RtspPort> = xmlParam(
 *   "RtspPort",
 *   { rtspPort: int(), enable: int() },
 * );
 * ```
 *
 * @template N The element name, such as `"RtspPort"`.
 * @template T The decoded value.
 */
export type XmlParam<N extends string, T> = {
  /** The element name. */
  name: N;
  /** The field codecs, in the order they are written. */
  fields: XmlFields;
  /** Writes the element, with `version="1.1"`. */
  encode: (value: T) => string;
  /** Reads the element's fields. */
  decode: (element: XmlElement) => T;
};

/**
 * Any {@link XmlParam}, whatever its value. `any` for the same variance
 * reason as {@link XmlFields}.
 */
// deno-lint-ignore no-explicit-any
export type AnyXmlParam = XmlParam<string, any>;

/** The decoded value of an {@link XmlParam}. */
export type XmlParamValue<P> = P extends XmlParam<string, infer T> ? T
  : never;

/**
 * Describes a parameter element and its fields.
 *
 * @param name The element name, exactly as the firmware writes it.
 * @param fields The field codecs, in the firmware's serializer order.
 * @returns The parameter codec.
 *
 * @example Describe the PTZ serial settings pushed as cmd 79
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { int, oneOf, text, xmlParam } from "@hertzg/reolink-api/protocol/xml";
 *
 * const serial = xmlParam("Serial", {
 *   channelId: int(),
 *   baudRate: int(),
 *   parity: oneOf("none", "odd", "even"),
 *   controlProtocol: text(),
 * });
 *
 * const root = parse(
 *   '<Serial version="1.1"><channelId>0</channelId><baudRate>9600</baudRate>' +
 *     "<parity>none</parity><controlProtocol>PELCO_D</controlProtocol></Serial>",
 * ).root;
 *
 * assertEquals(serial.decode(root), {
 *   channelId: 0,
 *   baudRate: 9600,
 *   parity: "none",
 *   controlProtocol: "PELCO_D",
 * });
 * ```
 */
export function xmlParam<const N extends string, const F extends XmlFields>(
  name: N,
  fields: F,
): XmlParam<N, XmlFieldsValue<F>> {
  return {
    name,
    fields,
    encode: (value) =>
      `<${name} version="1.1">${encodeFields(fields, value)}</${name}>`,
    decode: (element) => decodeFields(fields, element),
  };
}
