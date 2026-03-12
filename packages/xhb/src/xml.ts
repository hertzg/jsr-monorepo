/**
 * Minimal XML parser and serializer for the HomeBank XHB format.
 *
 * XHB files use a simple XML structure: an XML declaration, a `<homebank>`
 * root element with attributes, and flat self-closing child elements.
 * This module provides purpose-built parsing and serialization for that
 * specific structure, without the overhead of a general-purpose XML parser.
 *
 * @module
 */

/**
 * A parsed XML element with its tag name and attribute map.
 */
export interface XmlElement {
  /** The XML element tag name (e.g. `"homebank"`, `"account"`, `"pay"`). */
  tag: string;
  /** Map of attribute names to their unescaped string values. */
  attrs: Record<string, string>;
}

const XML_ENTITY_MAP: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
};

const XML_ESCAPE_MAP = new Map<string, string>([
  ["&", "&amp;"],
  ["<", "&lt;"],
  [">", "&gt;"],
  ['"', "&quot;"],
  ["'", "&apos;"],
]);

/**
 * Unescape standard XML entities in an attribute value string.
 *
 * Handles the five predefined XML entities and numeric character references
 * (`&#xNN;` and `&#NN;`).
 *
 * @param value The escaped attribute value string.
 * @returns The unescaped string.
 */
function unescapeXml(value: string): string {
  if (!value.includes("&")) return value;
  return value.replace(
    /&(amp|lt|gt|quot|apos|#x[0-9a-fA-F]+|#[0-9]+);/g,
    (_, entity: string) => {
      if (entity in XML_ENTITY_MAP) return XML_ENTITY_MAP[entity];
      const code = entity.startsWith("#x")
        ? parseInt(entity.slice(2), 16)
        : parseInt(entity.slice(1), 10);
      return String.fromCharCode(code);
    },
  );
}

/**
 * Escape a string for use in an XML attribute value.
 *
 * Encodes the five predefined XML entities: `&`, `<`, `>`, `"`, `'`.
 *
 * @param value The raw string.
 * @returns The XML-escaped string.
 */
export function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => XML_ESCAPE_MAP.get(ch)!);
}

/**
 * Parse attributes from a tag's attribute string.
 *
 * Scans character-by-character to extract `name="value"` and `name='value'`
 * pairs. Values are unescaped after extraction.
 *
 * @param s The raw attribute string (content between tag name and `>` or `/>`).
 * @returns A map of attribute names to unescaped values.
 */
function parseAttributes(s: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  let i = 0;
  const len = s.length;

  while (i < len) {
    // Skip whitespace
    while (i < len && s.charCodeAt(i) <= 0x20) i++;
    if (i >= len) break;

    // Read attribute name up to '='
    const nameStart = i;
    while (i < len && s[i] !== "=") i++;
    if (i >= len) break;
    const name = s.slice(nameStart, i).trimEnd();
    i++; // skip '='

    // Read quoted value. In valid XML, literal quote chars inside a value
    // are always entity-escaped (&quot; / &apos;), so scanning for the
    // matching literal quote is safe. unescapeXml handles entities after.
    const quote = s[i];
    if (quote !== '"' && quote !== "'") break;
    i++; // skip opening quote
    const valStart = i;
    while (i < len && s[i] !== quote) i++;
    const value = s.slice(valStart, i);
    i++; // skip closing quote

    attrs[name] = unescapeXml(value);
  }

  return attrs;
}

/**
 * Parse an XHB XML string into a list of elements.
 *
 * Handles the specific structure of HomeBank XHB files:
 * - Skips the XML declaration (`<?xml ...?>`)
 * - Parses the `<homebank ...>` root as an element with tag `"homebank"`
 * - Parses all self-closing child elements (`<tag .../>`)
 * - Skips the closing `</homebank>` tag
 * - Unescapes standard XML entities in attribute values
 *
 * @param xml The raw XHB XML string.
 * @returns An array of parsed XML elements. The first element is typically
 *   the `homebank` root with its version and date attributes.
 *
 * @example Parse a minimal XHB file
 * ```ts ignore
 * import { assertEquals } from "@std/assert";
 * import { parseXhb } from "@hertzg/xhb";
 *
 * const xml = '<?xml version="1.0"?>\n<homebank v="1.6">\n<pay key="1" name="Test"/>\n</homebank>\n';
 * const elements = parseXhb(xml);
 *
 * assertEquals(elements.length, 2);
 * assertEquals(elements[0].tag, "homebank");
 * assertEquals(elements[0].attrs.v, "1.6");
 * assertEquals(elements[1].tag, "pay");
 * assertEquals(elements[1].attrs.key, "1");
 * ```
 */
export function parseXhb(xml: string): XmlElement[] {
  const elements: XmlElement[] = [];
  const lines = xml.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("<?") || trimmed.startsWith("</")) {
      continue;
    }

    // Extract tag name: starts after '<', ends at first whitespace or '>' or '/'
    const tagStart = trimmed.indexOf("<");
    if (tagStart === -1) continue;

    let i = tagStart + 1;
    while (i < trimmed.length && trimmed[i] !== " " && trimmed[i] !== "/" && trimmed[i] !== ">") {
      i++;
    }
    const tag = trimmed.slice(tagStart + 1, i);
    if (!tag) continue;

    // Everything between end of tag name and closing '>' or '/>' is attributes
    const closingSlash = trimmed.endsWith("/>") ? trimmed.length - 2 : trimmed.length - 1;
    const attrString = trimmed.slice(i, closingSlash);
    const attrs = parseAttributes(attrString);

    elements.push({ tag, attrs });
  }

  return elements;
}

/**
 * Serialize a list of XHB XML elements to a HomeBank XHB string.
 *
 * Produces output matching HomeBank's serialization format:
 * - XML declaration: `<?xml version="1.0"?>`
 * - First element as opening root: `<homebank attr="val" ...>`
 * - All subsequent elements as self-closing: `<tag attr="val" .../>`
 * - Closing root: `</homebank>`
 *
 * Attribute values are XML-escaped during serialization.
 *
 * @param elements The array of XML elements to serialize. The first element
 *   should be the `homebank` root element.
 * @returns The serialized XHB XML string.
 *
 * @example Serialize elements to XHB XML
 * ```ts ignore
 * import { assertEquals } from "@std/assert";
 * import { serializeXhb } from "@hertzg/xhb";
 *
 * const elements = [
 *   { tag: "homebank", attrs: { v: "1.6" } },
 *   { tag: "pay", attrs: { key: "1", name: "Test" } },
 * ];
 *
 * const xml = serializeXhb(elements);
 * assertEquals(xml, '<?xml version="1.0"?>\n<homebank v="1.6">\n<pay key="1" name="Test"/>\n</homebank>\n');
 * ```
 */
export function serializeXhb(elements: XmlElement[]): string {
  const lines: string[] = ['<?xml version="1.0"?>'];

  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    const attrParts: string[] = [];
    for (const [name, value] of Object.entries(el.attrs)) {
      attrParts.push(`${name}="${escapeXml(value)}"`);
    }
    const attrStr = attrParts.length > 0 ? " " + attrParts.join(" ") : "";

    if (i === 0) {
      lines.push(`<${el.tag}${attrStr}>`);
    } else {
      lines.push(`<${el.tag}${attrStr}/>`);
    }
  }

  if (elements.length > 0) {
    lines.push(`</${elements[0].tag}>`);
  }

  return lines.join("\n") + "\n";
}
