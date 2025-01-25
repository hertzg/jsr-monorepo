/**
 * This module provides functions to parse and stringify wireguard configuration files.
 *
 * ```typescript
 * import { parse, stringify } from "@hertzg/wg-ini";
 * import { assertEquals } from "@std/assert";
 *
 * const str = `
 * [Interface]
 * PrivateKey = A
 * Address = 10.0.0.1/24
 *
 * [Peer]
 * PublicKey = B
 * AllowedIPs = 10.0.0.2/32
 *
 * [Peer]
 * PublicKey = C
 * AllowedIPs = 10.0.0.3/32
 * `;
 *
 * assertEquals(parse(str), [
 *  { section: null, entries: [], trailer: "" },
 *  { section: "Interface", entries: [["PrivateKey", "A", ""], ["Address", "10.0.0.1/24", ""]], trailer: "" },
 *  { section: "Peer", entries: [["PublicKey", "B", ""], ["AllowedIPs", "10.0.0.2/32", ""]], trailer: "" },
 *  { section: "Peer", entries: [["PublicKey", "C", ""], ["AllowedIPs", "10.0.0.3/32", ""]], trailer: "" }
 * ])
 *
 * ```
 *
 * @module
 */
function lineType(
  line: string
): "comment" | "section-start" | "key-value" | "other" {
  if (line.startsWith("[")) {
    return "section-start";
  } else if (line.includes("=")) {
    return "key-value";
  } else if (line.trim().startsWith(";")) {
    return "comment";
  } else {
    return "other";
  }
}

/**
 * Section entry in an INI file. Can be a string if it's a comment or a 3 element array if it's a key-value-trailer pair.
 * trailer = comment in most cases.
 *
 * @see {@link IniEntry} for more information on how this is used in the context of an INI file.
 */
export type Entry = [string, string, string] | string;

/**
 * The sectioned entry in an INI file, with a section name, entries and a trailer that the section header might have had.
 * Entries array can be an array of array or array of string. If it's a string, it's a comment or non key-value pair.
 *
 * @see {@link Entry} for more information on how this is used in the context of an INI file.
 */
export type IniEntry = {
  section: string | null;
  entries: Entry[];
  trailer: string;
};

/**
 * Parses an INI file text into an array of IniEntry objects.
 *
 * If the line starts with a `[`, it's considered a section start.
 * If the line contains a `=`, it's considered a key-value pair in the current section.
 * If the line is neither of the above, it's considered a comment.
 *
 * Since the section names can be repeated, the parsed object is an array of IniEntry objects
 * instead of a single object with section names as keys.
 *
 * @example
 * ```ts
 * import { parse } from "@hertzg/wg-ini";
 * import { assertEquals } from "@std/assert";
 *
 * const text = `
 * [Interface]
 * PrivateKey = ... ; This is a private key
 *
 * [Peer]
 * PublicKey = ... ; This is a public key
 *
 * [Peer] ; This is another peer
 * PublicKey = ... ; This is another public key
 * `;
 *
 * assertEquals(parse(text), [
 *  { section: null, entries: [], trailer: "" },
 *  { section: "Interface", entries: [["PrivateKey", "...", " This is a private key"]], trailer: "" },
 *  { section: "Peer", entries: [["PublicKey", "...", " This is a public key"]], trailer: "" },
 *  { section: "Peer", entries: [["PublicKey", "...", " This is another public key"]], trailer: " ; This is another peer" }
 * ]);
 * ```
 */
export function parse(text: string): IniEntry[] {
  const lines = text.split("\n");

  const parsed: IniEntry[] = [{ section: null, entries: [], trailer: "" }];
  let index = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const type = lineType(line);

    switch (type) {
      case "key-value":
        {
          const [key, ...rest] = line.split("=");
          const [value, ...trailers] = rest.join("=").split(";");
          parsed[index].entries.push([
            key.trim(),
            value.trim(),
            trailers.join(";"),
          ]);
        }
        break;

      case "comment":
        {
          parsed[index].entries.push(line.trim());
        }
        break;

      case "section-start":
        {
          index++;
          const indexOfNameEnd = line.indexOf("]");
          const section = line.slice(1, indexOfNameEnd);
          const trailer = line.slice(indexOfNameEnd + 1);
          parsed[index] = { section: section, entries: [], trailer };
        }
        break;
    }
  }

  return parsed;
}

/**
 * Does the opposite of {@link parse}. Converts an array of IniEntry objects into an INI file text.
 * Albeit, the output might not be exactly the same as the input, it should be semantically equivalent
 * and parsable by {@link parse} as well as wireguard.
 *
 * @param {IniEntry[]} parsed - The parsed INI file text.
 * @returns {string} - The INI file text.
 */
export function stringify(parsed: IniEntry[]): string {
  const text = parsed
    .filter(
      (iniEntry) =>
        iniEntry.section != null ||
        iniEntry.entries.length > 0 ||
        iniEntry.trailer.length > 0
    )
    .map(({ section, entries, trailer }, index, array) => {
      const block: string[] = [];

      const sectionHeader = `[${section}]`;
      block.push(
        section != null ? `${sectionHeader}${trailer ?? ""}` : trailer ?? ""
      );

      for (const [key, value, trailer] of entries) {
        block.push(`${key} = ${value}${trailer ?? ""}`);
      }

      if (index !== array.length - 1) {
        block.push("");
      }
      return block.join("\n");
    })
    .join("\n");
  return text;
}
