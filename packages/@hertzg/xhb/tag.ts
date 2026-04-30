import type { XmlElement } from "@std/xml";
import { atoi, parseGCharP } from "./_parse.ts";
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
export function parseTag({ attributes }: XmlElement): Tag {
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
  `<tag key="${tag.key}" name="${tag.name}"/>`;
