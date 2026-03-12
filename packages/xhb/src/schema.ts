/**
 * Runtime parse/serialize engine for HomeBank XHB entity schemas.
 *
 * Provides type-safe field parsing and serialization matching HomeBank's
 * C implementation (`hb_xml_append_int`, `hb_xml_append_txt`, etc.).
 *
 * @module
 */

/**
 * Field types matching HomeBank's `hb_xml_append_*` functions.
 *
 * - `"int"` - integer field, always serialized (maps to C `hb_xml_append_int0`)
 * - `"int0"` - integer field, omitted when value is 0 (maps to C `hb_xml_append_int`)
 * - `"txt"` - text field with standard XML escaping
 * - `"txt_crlf"` - text field with additional CR/LF encoding
 * - `"amt"` - amount (floating-point) field
 */
export type FieldType = "int" | "int0" | "txt" | "txt_crlf" | "amt";

/**
 * Definition of a single field in an entity schema.
 */
export interface FieldDef {
  /** XML attribute name, also used as the TypeScript property name. */
  attr: string;
  /** The field type controlling parse and serialize behavior. */
  type: FieldType;
}

/**
 * Schema defining how to parse and serialize an entity.
 */
export interface EntitySchema {
  /** XML element tag name. */
  tag: string;
  /** Ordered list of field definitions. */
  fields: FieldDef[];
  /** Optional extension hooks for custom parse/serialize logic. */
  extensions?: {
    /** Called after standard field parsing to handle custom attributes. */
    parse?: (
      attrs: Record<string, string>,
      entity: Record<string, unknown>,
    ) => void;
    /** Called during serialization to emit additional attribute strings. */
    serialize?: (entity: Record<string, unknown>) => string[];
  };
}

/**
 * Escape a string for use in an XML attribute value.
 *
 * Handles the five standard XML entities: `&`, `<`, `>`, `'`, `"`.
 *
 * @param str The raw string to escape.
 * @returns The XML-escaped string.
 */
function xmlEscape(str: string): string {
  let result = "";
  for (let i = 0; i < str.length; i++) {
    switch (str[i]) {
      case "&":
        result += "&amp;";
        break;
      case "<":
        result += "&lt;";
        break;
      case ">":
        result += "&gt;";
        break;
      case "'":
        result += "&apos;";
        break;
      case '"':
        result += "&quot;";
        break;
      default:
        result += str[i];
        break;
    }
  }
  return result;
}

/**
 * Escape a string for use in a `txt_crlf` XML attribute value.
 *
 * In addition to standard XML escaping, this encodes control characters
 * in the ranges used by HomeBank's `append_escaped_text` function:
 * `\n` (0xa) becomes `&#xa;`, `\r` (0xd) becomes `&#xd;`, and other
 * control characters in specific ranges are hex-encoded.
 *
 * @param str The raw string to escape.
 * @returns The escaped string with CR/LF encoding.
 */
function xmlEscapeCrlf(str: string): string {
  let result = "";
  for (let i = 0; i < str.length; i++) {
    switch (str[i]) {
      case "&":
        result += "&amp;";
        break;
      case "<":
        result += "&lt;";
        break;
      case ">":
        result += "&gt;";
        break;
      case "'":
        result += "&apos;";
        break;
      case '"':
        result += "&quot;";
        break;
      default: {
        const c = str.charCodeAt(i);
        if (
          (0x1 <= c && c <= 0x8) ||
          (0xa <= c && c <= 0xd) ||
          (0xe <= c && c <= 0x1f) ||
          (0x7f <= c && c <= 0x84) ||
          (0x86 <= c && c <= 0x9f)
        ) {
          result += `&#x${c.toString(16)};`;
        } else {
          result += str[i];
        }
        break;
      }
    }
  }
  return result;
}

/**
 * Unescape `txt_crlf` hex-encoded entities back to their character values.
 *
 * Converts `&#xa;` to `\n`, `&#xd;` to `\r`, and other `&#xNN;` sequences
 * to their corresponding characters.
 *
 * @param str The escaped string from an XML attribute.
 * @returns The unescaped string with CR/LF restored.
 */
function unescapeCrlf(str: string): string {
  return str.replace(/&#x([0-9a-fA-F]+);/g, (_match, hex) =>
    String.fromCharCode(parseInt(hex, 16)));
}

/**
 * Convert an XML attribute string to a typed value based on field type.
 *
 * Maps HomeBank field types to their JavaScript representations:
 * - `"int"` / `"int0"`: parsed as integer via `parseInt(value, 10)`
 * - `"txt"`: returned as-is (XML parser already unescapes standard entities)
 * - `"txt_crlf"`: unescapes `&#xa;` to `\n` and `&#xd;` to `\r`
 * - `"amt"`: parsed as float via `parseFloat(value)`
 *
 * @param value The raw XML attribute string.
 * @param type The field type determining how to parse the value.
 * @returns The parsed value as a number or string.
 *
 * @example Parse integer field
 * ```ts ignore
 * import { assertEquals } from "@std/assert";
 * import { parseField } from "@hertzg/xhb";
 *
 * assertEquals(parseField("42", "int"), 42);
 * assertEquals(parseField("hello", "txt"), "hello");
 * assertEquals(parseField("3.14", "amt"), 3.14);
 * ```
 */
export function parseField(value: string, type: FieldType): number | string {
  switch (type) {
    case "int":
    case "int0":
      return parseInt(value, 10);
    case "txt":
      return value;
    case "txt_crlf":
      return unescapeCrlf(value);
    case "amt":
      return parseFloat(value);
  }
}

/**
 * Convert a typed value back to an XML attribute string based on field type.
 *
 * Maps JavaScript values back to their XML attribute representations:
 * - `"int"`: converted via `String(value)`
 * - `"int0"`: converted via `String(value)`, returns `""` if value is `0`
 * - `"txt"`: XML-escaped with standard entities
 * - `"txt_crlf"`: XML-escaped with additional CR/LF encoding
 * - `"amt"`: formatted as decimal string matching C's `g_ascii_formatd` `%.10g`
 *
 * @param value The typed value to serialize.
 * @param type The field type determining how to serialize the value.
 * @returns The serialized XML attribute string, or `""` for omitted fields.
 *
 * @example Serialize integer field
 * ```ts ignore
 * import { assertEquals } from "@std/assert";
 * import { serializeField } from "@hertzg/xhb";
 *
 * assertEquals(serializeField(42, "int"), "42");
 * assertEquals(serializeField(0, "int0"), "");
 * assertEquals(serializeField(3.14, "amt"), "3.14");
 * ```
 */
export function serializeField(
  value: number | string,
  type: FieldType,
): string {
  switch (type) {
    case "int":
      return String(value);
    case "int0":
      return value === 0 ? "" : String(value);
    case "txt":
      return xmlEscape(String(value));
    case "txt_crlf":
      return xmlEscapeCrlf(String(value));
    case "amt": {
      // Match C's g_ascii_formatd with %.10g precision
      const num = Number(value);
      // toPrecision(10) matches %.10g behavior: 10 significant digits
      const formatted = num.toPrecision(10);
      // Remove trailing zeros after decimal point (like %g)
      if (formatted.includes(".")) {
        return formatted.replace(/\.?0+$/, "");
      }
      return formatted;
    }
  }
}

/**
 * Parse XML attributes into a typed entity object using a schema.
 *
 * Iterates over the schema's field definitions, extracting and converting
 * each matching XML attribute. Fields missing from the attributes map
 * receive default values: `0` for numeric types, `""` for text types.
 * If the schema defines a `parse` extension, it is called after standard
 * field processing.
 *
 * @template T The expected entity type.
 * @param schema The entity schema defining fields and their types.
 * @param attrs The raw XML attribute map from the parser.
 * @returns The parsed entity object.
 *
 * @example Parse attributes with a schema
 * ```ts ignore
 * import { assertEquals } from "@std/assert";
 * import { parseEntity } from "@hertzg/xhb";
 *
 * const schema = {
 *   tag: "pay",
 *   fields: [
 *     { attr: "key", type: "int" as const },
 *     { attr: "name", type: "txt" as const },
 *   ],
 * };
 *
 * const result = parseEntity(schema, { key: "1", name: "Groceries" });
 * assertEquals(result, { key: 1, name: "Groceries" });
 * ```
 */
export function parseEntity<T = Record<string, unknown>>(
  schema: EntitySchema,
  attrs: Record<string, string>,
): T {
  const entity: Record<string, unknown> = {};
  for (const field of schema.fields) {
    const rawValue = attrs[field.attr];
    if (rawValue !== undefined) {
      entity[field.attr] = parseField(rawValue, field.type);
    } else {
      // Default values for missing attributes
      switch (field.type) {
        case "int":
        case "int0":
          entity[field.attr] = 0;
          break;
        case "txt":
        case "txt_crlf":
          entity[field.attr] = "";
          break;
        case "amt":
          entity[field.attr] = 0;
          break;
      }
    }
  }
  if (schema.extensions?.parse) {
    schema.extensions.parse(attrs, entity);
  }
  return entity as T;
}

/**
 * Serialize a typed entity object to an XML self-closing tag string.
 *
 * Produces output matching HomeBank's C serialization format:
 * `<tag attr1="val1" attr2="val2"/>\n`
 *
 * Fields are omitted when:
 * - `"int0"` fields have a value of `0`
 * - `"txt"` or `"txt_crlf"` fields have an empty string value
 *
 * If the schema defines a `serialize` extension, its returned attribute
 * strings are appended after the standard fields.
 *
 * @param schema The entity schema defining fields and their types.
 * @param entity The typed entity object to serialize.
 * @returns The XML self-closing tag string with a trailing newline.
 *
 * @example Serialize an entity with a schema
 * ```ts ignore
 * import { assertEquals } from "@std/assert";
 * import { serializeEntity } from "@hertzg/xhb";
 *
 * const schema = {
 *   tag: "pay",
 *   fields: [
 *     { attr: "key", type: "int" as const },
 *     { attr: "name", type: "txt" as const },
 *   ],
 * };
 *
 * const result = serializeEntity(schema, { key: 1, name: "Groceries" });
 * assertEquals(result, '<pay key="1" name="Groceries"/>\n');
 * ```
 */
export function serializeEntity(
  schema: EntitySchema,
  entity: Record<string, unknown>,
): string {
  const parts: string[] = [];
  for (const field of schema.fields) {
    const value = entity[field.attr];
    if (value === undefined || value === null) {
      continue;
    }
    // Omit empty text fields
    if (
      (field.type === "txt" || field.type === "txt_crlf") && value === ""
    ) {
      continue;
    }
    const serialized = serializeField(value as number | string, field.type);
    // serializeField returns "" for int0 when value is 0
    if (serialized === "") {
      continue;
    }
    parts.push(`${field.attr}="${serialized}"`);
  }
  if (schema.extensions?.serialize) {
    const extra = schema.extensions.serialize(entity);
    for (const attr of extra) {
      if (attr && attr.length > 0) {
        parts.push(attr);
      }
    }
  }
  const attrStr = parts.length > 0 ? " " + parts.join(" ") : "";
  return `<${schema.tag}${attrStr}/>\n`;
}
