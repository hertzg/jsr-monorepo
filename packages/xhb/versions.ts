import type { Node } from "xml-parser";
import { parseGDouble, parseGInt } from "./_parse.ts";
import printj from "printj";
const { sprintf } = printj;
import type { gDouble, gInt } from "./_g_types.ts";

/** XHB file and data format version information from the `<homebank>` root element. */
export interface Versions {
  /** File format version string (e.g. `"1.4"`). */
  file: gDouble;
  /** Data version as a 6-digit integer (e.g. `50800`). */
  data: gInt;
}

/**
 * Parses version attributes from the `<homebank>` root XML node.
 *
 * @param node - The root XML node.
 * @returns The parsed version information.
 */
export function parseVersions({ attributes }: Node): Versions {
  return {
    file: parseGDouble(attributes.v),
    data: parseGInt(attributes.d),
  };
}

/**
 * Serializes version information into the `<homebank>` opening tag.
 *
 * @param versions - The version data to serialize.
 * @returns The opening `<homebank v="..." d="...">` tag.
 */
export const serializeVersions = (versions: Versions): string =>
  sprintf('<homebank v="%s" d="%06d">', versions.file, versions.data);
