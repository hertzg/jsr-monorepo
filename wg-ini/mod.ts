import { TextLineStream } from "@std/streams";
import {
  type IniLineAssign,
  IniLineDecoderStream,
  IniLineEncoderStream,
  type IniLineSection,
  type IniLineTrailer,
} from "./lines.ts";
import {
  type IniSection,
  IniSectionDecoderStream,
  IniSectionEncoderStream,
} from "./sections.ts";

/**
 * High-level utilities for working with INI data.
 *
 * Provides helpers to parse and stringify INI text as arrays or objects, and
 * stream-based transformers via {@link decodeTextStream} and {@link encodeSectionStream}.
 *
 * @example Parse/roundtrip via arrays
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseArray, stringifyArray } from "@hertzg/wg-ini";
 *
 * const text = [
 *   "global_key=global_value",
 *   "",
 *   "[mysection]",
 *   "key1=1",
 *   "key2=2",
 *   "",
 * ].join("\n");
 *
 * const arr = await parseArray(text);
 * assertEquals(arr, [[null, [["global_key","global_value"]]], ["mysection", [["key1","1"],["key2","2"]]]]);
 *
 * const roundtrip = await stringifyArray(arr as any);
 * assertEquals(typeof roundtrip, "string");
 * ```
 *
 * @module
 */
/**
 * Utility function to parse an INI string into an array of sections.
 * Since it returns an array, it supports duplicate keys and sections.
 * This is the reverse of {@link stringifyArray}.
 *
 * Returns an array of sections, each section is represented by a tuple of section name and an array of key-value pairs.
 * If section name is `null`, it represents the global section. Order of sections is preserved.
 *
 * @example
 * ```ts
 * import { parseArray } from "@hertzg/wg-ini";
 * import { assertEquals } from "@std/assert";
 *
 * const text = [
 *   "global_key=global_value",
 *   "",
 *   "[mysection]",
 *   "key1=1",
 *   "key2=2",
 *   "",
 * ].join("\n")
 *
 * assertEquals(await parseArray(text), [
 *  [null, [["global_key", "global_value"]]],
 *  ["mysection", [["key1", "1"], ["key2", "2"]]],
 * ]);
 * ```
 */
export async function parseArray(
  text: string,
): Promise<[string | null, string[][]][]> {
  const sections = await decodeText(text);

  return sections.map((section) => {
    const entries = section.entries
      .filter((entry) => "$assign" in entry)
      .map((entry) => entry.$assign as string[]);

    return [section.section?.$section ?? null, entries];
  });
}

/**
 * Utility function to convert an array of sections to an INI string.
 * Since it takes an array, it supports duplicate keys and sections.
 * This is the reverse of {@link parseArray}.
 *
 * Takes an array of sections, each section must be represented by a tuple of section name and an array of key-value pairs.
 * If section name is `null`, it's considered as the global section. Order of sections is preserved except for the global section which is always first.
 *
 * @example
 * ```ts
 * import { stringifyArray } from "@hertzg/wg-ini";
 * import { assertEquals } from "@std/assert";
 *
 * const array = [
 *  [null, [["global_key_null", "global_value"]]],
 *  ["mysection", [["key1", "1"], ["key2", "2"]]],
 * ] as any;
 *
 * assertEquals(await stringifyArray(array), [
 *  "global_key_null=global_value",
 *  "",
 *  "[mysection]",
 *  "key1=1",
 *  "key2=2",
 *  "",
 * ].join("\n"));
 * ```
 */
export async function stringifyArray(
  array: [string | null, string[][]][],
): Promise<string> {
  const sections: IniSection[] = array
    .map(([sectionName, assigns]) => {
      const section: IniLineSection | null = sectionName == null
        ? null
        : { $section: sectionName };

      const entries: (IniLineAssign | IniLineTrailer)[] = assigns.map(
        ([key, value]) => ({
          $assign: [key, value],
        }),
      );
      entries.push({ $trailer: "" });

      return { section, entries };
    })
    .sort((a, b) => {
      if (a.section === null) return -1;
      if (b.section === null) return 1;
      return 0;
    });

  return await encodeString(sections);
}

/**
 * Utility function to parse an INI string into an object.
 * Since it returns an object, it does not support duplicate keys or sections.
 * This is the reverse of {@link stringifyObject} and uses {@link parseArray} under the hood.
 *
 * @example
 * ```ts
 * import { parseObject } from "@hertzg/wg-ini";
 * import { assertEquals } from "@std/assert";
 *
 * const text = [
 *   "global_key=global_value",
 *   "",
 *   "[mysection]",
 *   "key1=1",
 *   "key2=2",
 *   "",
 * ].join("\n")
 *
 * assertEquals(await parseObject(text), {
 *  "": { global_key: "global_value" },
 *  mysection: { key1: "1", key2: "2" },
 * });
 * ```
 *
 * @param text
 * @returns
 */
export async function parseObject(
  text: string,
): Promise<Record<string, Record<string, unknown>>> {
  const sections = await parseArray(text);

  const obj: Record<string, Record<string, string>> = {};
  for (const [sectionName, assigns] of sections) {
    const entries: Record<string, string> = {};
    for (const [key, value] of assigns) {
      entries[key] = value;
    }
    obj[sectionName ?? ""] = entries;
  }

  return obj;
}

/**
 * Utility function to convert an object to an INI string.
 * Since it takes an object, it does not support duplicate keys or sections.
 * This is the reverse of {@link parseObject} and uses {@link stringifyArray} under the hood.
 *
 * Global properties are represented by an empty string key.
 *
 * @example
 * ```ts
 * import { stringifyObject } from "@hertzg/wg-ini";
 * import { assertEquals } from "@std/assert";
 *
 * const obj = {
 *  "": { global_key: "global_value" },
 *  mysection: { key1: "1", key2: "2" },
 * };
 *
 * assertEquals(await stringifyObject(obj), [
 *   "global_key=global_value",
 *   "",
 *   "[mysection]",
 *   "key1=1",
 *   "key2=2",
 *   "",
 * ].join("\n"));
 * ```
 *
 * @param {Record<string, Record<string, unknown>>} obj - The object to convert to an INI string.
 * @returns {string} The INI string.
 */
export async function stringifyObject(
  obj: Record<string, Record<string, unknown>>,
): Promise<string> {
  const array = Object.entries(obj).map(
    ([sectionName, entries]) =>
      [
        sectionName === "" ? null : sectionName,
        Object.entries(entries) as string[][],
      ] satisfies [string | null, string[][]],
  );

  return await stringifyArray(array);
}

export function decodeTextStream(
  stream: ReadableStream<string>,
): ReadableStream<IniSection> {
  return stream
    .pipeThrough(new TextLineStream())
    .pipeThrough(new IniLineDecoderStream())
    .pipeThrough(new IniSectionDecoderStream());
}

async function decodeText(text: string): Promise<IniSection[]> {
  return await Array.fromAsync(decodeTextStream(ReadableStream.from([text])));
}

export function encodeSectionStream(
  stream: ReadableStream<IniSection>,
): ReadableStream<string> {
  return stream
    .pipeThrough(new IniSectionEncoderStream())
    .pipeThrough(new IniLineEncoderStream());
}

async function encodeString(sections: IniSection[]): Promise<string> {
  const lines = await Array.fromAsync(
    encodeSectionStream(ReadableStream.from(sections)),
  );
  return lines.join("\n");
}
