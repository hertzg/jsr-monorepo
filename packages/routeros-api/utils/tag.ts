/**
 * Tag utilities for MikroTik API
 *
 * Tags allow multiplexing multiple requests over a single connection.
 * Tags are API attributes with the format .tag=value
 */

/**
 * Extracts the tag value from a sentence (array of words)
 *
 * Searches for the .tag attribute in the word array and returns its value.
 * Tags are used for multiplexing multiple concurrent requests over a single
 * connection.
 *
 * @param words - Array of words from a sentence
 * @returns The tag value if present, undefined otherwise
 *
 * @example Extract tag from sentence
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { getTag } from "@hertzg/routeros-api/utils/tag";
 *
 * const words = ["/interface/print", ".tag=abc123"];
 * const tag = getTag(words);
 * assertEquals(tag, "abc123");
 * ```
 *
 * @example No tag present
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { getTag } from "@hertzg/routeros-api/utils/tag";
 *
 * const words = ["/interface/print"];
 * const tag = getTag(words);
 * assertEquals(tag, undefined);
 * ```
 */
export function getTag(words: string[]): string | undefined {
  for (const word of words) {
    if (word.startsWith(".tag=")) {
      return word.substring(5); // Remove ".tag=" prefix
    }
  }
  return undefined;
}

/**
 * Adds or replaces a tag in a sentence
 *
 * Creates a new word array with the specified tag. If a tag already exists,
 * it is removed first before adding the new one.
 *
 * @param words - Array of words from a sentence
 * @param tag - The tag value to add
 * @returns New array with the tag word appended
 *
 * @example Add tag to sentence
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { withTag } from "@hertzg/routeros-api/utils/tag";
 *
 * const words = ["/interface/print"];
 * const tagged = withTag(words, "req-001");
 * assertEquals(tagged, ["/interface/print", ".tag=req-001"]);
 * ```
 *
 * @example Replace existing tag
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { withTag } from "@hertzg/routeros-api/utils/tag";
 *
 * const words = ["/interface/print", ".tag=old"];
 * const tagged = withTag(words, "new");
 * assertEquals(tagged, ["/interface/print", ".tag=new"]);
 * ```
 */
export function withTag(words: string[], tag: string): string[] {
  // Remove existing tag if present
  const filtered = words.filter((word) => !word.startsWith(".tag="));

  // Add new tag
  return [...filtered, `.tag=${tag}`];
}

/**
 * Removes the tag from a sentence
 *
 * Creates a new word array without any .tag attribute.
 *
 * @param words - Array of words from a sentence
 * @returns New array without the tag word
 *
 * @example Remove tag from sentence
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { withoutTag } from "@hertzg/routeros-api/utils/tag";
 *
 * const words = ["/interface/print", ".tag=abc123"];
 * const untagged = withoutTag(words);
 * assertEquals(untagged, ["/interface/print"]);
 * ```
 *
 * @example Remove from untagged sentence
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { withoutTag } from "@hertzg/routeros-api/utils/tag";
 *
 * const words = ["/interface/print"];
 * const untagged = withoutTag(words);
 * assertEquals(untagged, ["/interface/print"]);
 * ```
 */
export function withoutTag(words: string[]): string[] {
  return words.filter((word) => !word.startsWith(".tag="));
}

/**
 * Checks if a sentence has a tag
 *
 * Returns true if any word in the array is a .tag attribute.
 *
 * @param words - Array of words from a sentence
 * @returns True if a tag is present
 *
 * @example Check for tag presence
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { hasTag } from "@hertzg/routeros-api/utils/tag";
 *
 * assertEquals(hasTag(["/interface/print", ".tag=abc"]), true);
 * assertEquals(hasTag(["/interface/print"]), false);
 * ```
 */
export function hasTag(words: string[]): boolean {
  return words.some((word) => word.startsWith(".tag="));
}

/**
 * Checks if a sentence has a specific tag value
 *
 * Returns true if the word array contains a .tag attribute with the
 * specified value.
 *
 * @param words - Array of words from a sentence
 * @param tag - The tag value to check for
 * @returns True if the specific tag value is present
 *
 * @example Check for specific tag value
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { hasTagValue } from "@hertzg/routeros-api/utils/tag";
 *
 * const words = ["/interface/print", ".tag=abc123"];
 * assertEquals(hasTagValue(words, "abc123"), true);
 * assertEquals(hasTagValue(words, "xyz789"), false);
 * ```
 */
export function hasTagValue(words: string[], tag: string): boolean {
  return words.some((word) => word === `.tag=${tag}`);
}
