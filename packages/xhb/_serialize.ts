import printj from "printj";
const { sprintf } = printj;
import type { gCharP, gDouble, gUInt32 } from "./_g_types.ts";

/**
 * Formats a string XML attribute. Returns an empty string if the value is
 * null or undefined.
 *
 * @param attrName - The attribute name.
 * @param value - The string value.
 * @returns The formatted `name="value"` pair, or `""`.
 */
export const hb_xml_attr_txt = (attrName: string, value: gCharP): string =>
  value === null || value === undefined
    ? ""
    : sprintf('%s="%s"', attrName, value);

/**
 * Escapes special XML characters and control characters in a string,
 * following HomeBank's `hb_xml_escape_text` behavior.
 *
 * @param str - The string to escape.
 * @returns The escaped string safe for use in XML attributes.
 */
export const hb_escape_text = (str: gCharP): string => {
  let newStr = "";
  for (let i = 0, ln = str.length; i < ln; i++) {
    switch (str[i]) {
      case "&":
        newStr += "&amp;";
        break;

      case "<":
        newStr += "&lt;";
        break;

      case ">":
        newStr += "&gt;";
        break;

      case "'":
        newStr += "&apos;";
        break;

      case '"':
        newStr += "&quot;";
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
          newStr += sprintf("&#x%x;", c);
        } else {
          newStr += str[i];
        }
      }
    }
  }

  return newStr;
};

/**
 * Formats a string XML attribute with CRLF/control-character escaping.
 * Returns an empty string if the value is null or undefined.
 *
 * @param attrName - The attribute name.
 * @param value - The string value (may contain special characters).
 * @returns The formatted `name="escaped_value"` pair, or `""`.
 */
export const hb_xml_attr_txt_crlf = (
  attrName: string,
  value: gCharP,
): string =>
  value === null || value === undefined
    ? ""
    : hb_xml_attr_txt(attrName, hb_escape_text(value));

/**
 * Formats an integer XML attribute, always emitting the value even if zero.
 * Returns an empty string if the value is null or undefined.
 *
 * @param attrName - The attribute name.
 * @param value - The integer value.
 * @returns The formatted `name="value"` pair, or `""`.
 */
export const hb_xml_attr_int0 = (attrName: string, value: number): string =>
  value === null || value === undefined
    ? ""
    : sprintf('%s="%d"', attrName, value);

/**
 * Formats an integer XML attribute, omitting it when the value is zero.
 *
 * @param attrName - The attribute name.
 * @param value - The integer value.
 * @returns The formatted `name="value"` pair, or `""` if value is 0.
 */
export const hb_xml_attr_int = (attrName: string, value: number): string =>
  value === 0 ? "" : hb_xml_attr_int0(attrName, value);

/**
 * Converts a {@linkcode gDouble} to its string representation.
 *
 * @param d - The double value (already stored as string).
 * @returns The string representation.
 */
export const dtostr = (d: gDouble): string => d;

/**
 * Builds a self-closing XML tag from a prefix and a list of attribute strings.
 * Empty or falsy attributes are filtered out.
 *
 * @param prefix - The tag opening (e.g. `"<account"`).
 * @param _attrs - Attribute strings to include.
 * @returns The complete self-closing XML tag.
 */
export const hb_xml_tag = (prefix: string, ..._attrs: string[]): string => {
  const attrs = _attrs.filter((v) => v && v.length);
  return `${prefix}${attrs.length ? " " : ""}${attrs.join(" ")}/>`;
};

/**
 * Formats an amount (double) XML attribute.
 * Returns an empty string if the value is null or undefined.
 *
 * @param attrName - The attribute name.
 * @param amt - The amount as a string-encoded double.
 * @returns The formatted `name="value"` pair, or `""`.
 */
export const hb_xml_attr_amt = (attrName: string, amt: gDouble): string =>
  amt === null || amt === undefined
    ? ""
    : sprintf('%s="%s"', attrName, dtostr(amt));

/**
 * Joins an array of tag names into a space-separated string.
 *
 * @param tags - The tags array to join.
 * @returns The space-separated string, or `""` if empty/falsy.
 */
export const tags_toStr = (tags: unknown): string =>
  tags && Array.isArray(tags) ? tags.join(" ") : "";

/** Raw split data used internally for XML attribute serialization. */
export interface AttrSplit {
  /** Category key. */
  cat: gUInt32;
  /** Amount as string-encoded double. */
  amt: gDouble;
  /** Memo text. */
  mem: gCharP;
}

/**
 * Serializes an array of splits into `scat`, `samt`, and `smem` XML
 * attribute strings separated by `||`.
 *
 * @param splits - The split entries to serialize.
 * @returns The formatted attribute string, or `""` if empty.
 */
export const hb_xml_attrs_splits = (splits: AttrSplit[]): string =>
  splits && splits.length
    ? [
      hb_xml_attr_txt("scat", splits.map((v) => v.cat).join("||")),
      hb_xml_attr_txt("samt", splits.map((v) => dtostr(v.amt)).join("||")),
      hb_xml_attr_txt(
        "smem",
        splits
          .map((v) =>
            (v.mem === null || v.mem === undefined ? "" : v.mem).replace(
              "|",
              "",
            )
          )
          .join("||"),
      ),
    ].join(" ")
    : "";
