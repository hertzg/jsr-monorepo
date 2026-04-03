import type { Node } from "xml-parser";
import { atoi, parseGCharP } from "./_parse.ts";
import printj from "printj";
const { sprintf } = printj;
import type { gCharP, gUInt32 } from "./_g_types.ts";

/** A user-defined tag from the `<tag>` element. */
export interface Tag {
  /** Unique tag key. */
  key: gUInt32;
  /** Tag name. */
  name: gCharP;
}

/**
 * Parses a `<tag>` XML node into a {@linkcode Tag} object.
 *
 * @param node - The `<tag>` XML node.
 * @returns The parsed tag.
 */
export function parseTag({ attributes }: Node): Tag {
  return {
    key: atoi(attributes.key),
    name: parseGCharP(attributes.name),
  };
}

/**
 * Serializes a {@linkcode Tag} object into a `<tag ... />` XML tag.
 *
 * @param tag - The tag to serialize.
 * @returns The self-closing XML tag string.
 */
export const serializeTag = (tag: Tag): string =>
  sprintf('<tag key="%d" name="%s"/>', tag.key, tag.name);
