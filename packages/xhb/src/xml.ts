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

/**
 * Unescape standard XML entities in an attribute value string.
 *
 * Handles the five predefined XML entities:
 * - `&amp;` to `&`
 * - `&lt;` to `<`
 * - `&gt;` to `>`
 * - `&quot;` to `"`
 * - `&apos;` to `'`
 *
 * Also handles numeric character references (`&#xNN;` and `&#NN;`).
 *
 * @param value The escaped attribute value string.
 * @returns The unescaped string.
 */
function unescapeXml(value: string): string {
  return value.replace(/&(amp|lt|gt|quot|apos|#x[0-9a-fA-F]+|#[0-9]+);/g,
    (_match, entity: string) => {
      switch (entity) {
        case "amp":
          return "&";
        case "lt":
          return "<";
        case "gt":
          return ">";
        case "quot":
          return '"';
        case "apos":
          return "'";
        default:
          if (entity.startsWith("#x")) {
            return String.fromCharCode(parseInt(entity.slice(2), 16));
          }
          return String.fromCharCode(parseInt(entity.slice(1), 10));
      }
    });
}

/**
 * Escape a string for use in an XML attribute value.
 *
 * Encodes the five predefined XML entities: `&`, `<`, `>`, `"`, `'`.
 *
 * @param value The raw string.
 * @returns The XML-escaped string.
 */
function escapeXml(value: string): string {
  let result = "";
  for (let i = 0; i < value.length; i++) {
    switch (value[i]) {
      case "&":
        result += "&amp;";
        break;
      case "<":
        result += "&lt;";
        break;
      case ">":
        result += "&gt;";
        break;
      case '"':
        result += "&quot;";
        break;
      case "'":
        result += "&apos;";
        break;
      default:
        result += value[i];
        break;
    }
  }
  return result;
}

/**
 * Parse attributes from a tag string (the content between `<tag` and `>` or `/>`).
 *
 * @param attrString The raw attribute string.
 * @returns A map of attribute names to unescaped values.
 */
function parseAttributes(attrString: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  // Match attribute="value" pairs, handling both single and double quotes
  const attrRegex = /(\w[\w\-.]*)=(?:"([^"]*)"|'([^']*)')/g;
  let match: RegExpExecArray | null;
  while ((match = attrRegex.exec(attrString)) !== null) {
    const name = match[1];
    const value = match[2] !== undefined ? match[2] : match[3];
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
 * - Parses all self-closing child elements (`<tag .../>`  )
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
 * import { parseXml } from "@hertzg/xhb";
 *
 * const xml = '<?xml version="1.0"?>\n<homebank v="1.6">\n<pay key="1" name="Test"/>\n</homebank>\n';
 * const elements = parseXml(xml);
 *
 * assertEquals(elements.length, 2);
 * assertEquals(elements[0].tag, "homebank");
 * assertEquals(elements[0].attrs.v, "1.6");
 * assertEquals(elements[1].tag, "pay");
 * assertEquals(elements[1].attrs.key, "1");
 * ```
 */
export function parseXml(xml: string): XmlElement[] {
  const elements: XmlElement[] = [];

  // Match XML tags: processing instructions, opening, self-closing, and closing
  const tagRegex = /<([?/]?)(\w[\w-]*)([^>]*?)([?/]?)>/g;
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(xml)) !== null) {
    const prefix = match[1]; // "?" for PI, "/" for closing, "" for opening
    const tagName = match[2];
    const attrString = match[3];
    const suffix = match[4]; // "?" for PI end, "/" for self-closing

    // Skip XML processing instructions (<?xml ...?>)
    if (prefix === "?") {
      continue;
    }

    // Skip closing tags (</homebank>)
    if (prefix === "/") {
      continue;
    }

    const attrs = parseAttributes(attrString);

    // Self-closing tag (<tag .../>) or opening tag (<homebank ...>)
    if (suffix === "/" || tagName === "homebank") {
      elements.push({ tag: tagName, attrs });
    }
  }

  return elements;
}

/**
 * Serialize a list of XML elements back to an XHB XML string.
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
 * import { serializeXml } from "@hertzg/xhb";
 *
 * const elements = [
 *   { tag: "homebank", attrs: { v: "1.6" } },
 *   { tag: "pay", attrs: { key: "1", name: "Test" } },
 * ];
 *
 * const xml = serializeXml(elements);
 * assertEquals(xml, '<?xml version="1.0"?>\n<homebank v="1.6">\n<pay key="1" name="Test"/>\n</homebank>\n');
 * ```
 */
export function serializeXml(elements: XmlElement[]): string {
  const lines: string[] = [];
  lines.push('<?xml version="1.0"?>');

  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    const attrParts: string[] = [];
    for (const [name, value] of Object.entries(el.attrs)) {
      attrParts.push(`${name}="${escapeXml(value)}"`);
    }
    const attrStr = attrParts.length > 0 ? " " + attrParts.join(" ") : "";

    if (i === 0) {
      // First element is the root — emit as opening tag
      lines.push(`<${el.tag}${attrStr}>`);
    } else {
      // Subsequent elements are self-closing
      lines.push(`<${el.tag}${attrStr}/>`);
    }
  }

  if (elements.length > 0) {
    lines.push(`</${elements[0].tag}>`);
  }

  return lines.join("\n") + "\n";
}
