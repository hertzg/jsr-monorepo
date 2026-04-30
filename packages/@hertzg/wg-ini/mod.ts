/**
 * High-level utilities for working with INI data.
 *
 * Provides helpers to parse and stringify INI text as arrays or objects, and
 * stream-based transformers via {@link decodeTextStream} and {@link encodeSectionStream}.
 *
 * The array-based functions ({@link parseArray}, {@link stringifyArray}) preserve
 * duplicate keys and sections, while the object-based functions ({@link parseObject},
 * {@link stringifyObject}) collapse duplicates into single values.
 *
 * @example Parse and roundtrip via arrays
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
 * assertEquals(arr, [
 *   [null, [["global_key", "global_value"]]],
 *   ["mysection", [["key1", "1"], ["key2", "2"]]],
 * ]);
 *
 * const roundtrip = await stringifyArray(arr);
 * assertEquals(roundtrip, text);
 * ```
 *
 * @example Parse and stringify via objects
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseObject, stringifyObject } from "@hertzg/wg-ini";
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
 * const obj = await parseObject(text);
 * assertEquals(obj, {
 *   "": { global_key: "global_value" },
 *   mysection: { key1: "1", key2: "2" },
 * });
 *
 * const roundtrip = await stringifyObject(obj);
 * assertEquals(roundtrip, text);
 * ```
 *
 * @module
 */
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
 * Parse an INI string into an array of sections.
 *
 * Since it returns an array, it supports duplicate keys and sections.
 * This is the reverse of {@link stringifyArray}.
 *
 * Each section is represented by a tuple of `[sectionName, entries]` where
 * `sectionName` is `null` for the global section, and `entries` is an array
 * of `[key, value]` pairs. Order of sections and entries is preserved.
 *
 * @param text The INI content as a string.
 * @returns A promise resolving to an array of section tuples.
 *
 * @example Parse INI with global and named sections
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
 * ].join("\n");
 *
 * assertEquals(await parseArray(text), [
 *   [null, [["global_key", "global_value"]]],
 *   ["mysection", [["key1", "1"], ["key2", "2"]]],
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
 * Convert an array of sections to an INI string.
 *
 * Since it takes an array, it supports duplicate keys and sections.
 * This is the reverse of {@link parseArray}.
 *
 * Each section must be a tuple of `[sectionName, entries]` where `sectionName`
 * is `null` for the global section, and `entries` is an array of `[key, value]`
 * pairs. The global section is always placed first in the output.
 *
 * @param array An array of section tuples to stringify.
 * @returns A promise resolving to the INI content as a string.
 *
 * @example Stringify array with global and named sections
 * ```ts
 * import { stringifyArray } from "@hertzg/wg-ini";
 * import { assertEquals } from "@std/assert";
 *
 * const array: [string | null, string[][]][] = [
 *   [null, [["global_key", "global_value"]]],
 *   ["mysection", [["key1", "1"], ["key2", "2"]]],
 * ];
 *
 * assertEquals(await stringifyArray(array), [
 *   "global_key=global_value",
 *   "",
 *   "[mysection]",
 *   "key1=1",
 *   "key2=2",
 *   "",
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
 * Parse an INI string into an object.
 *
 * Since it returns an object, it does not support duplicate keys or sections.
 * If duplicates exist, later values overwrite earlier ones.
 * This is the reverse of {@link stringifyObject} and uses {@link parseArray} under the hood.
 *
 * The global section (entries before any `[section]` header) is stored under
 * the empty string key `""`.
 *
 * @param text The INI content as a string.
 * @returns A promise resolving to a nested object of sections and key-value pairs.
 *
 * @example Parse INI to object
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
 * ].join("\n");
 *
 * assertEquals(await parseObject(text), {
 *   "": { global_key: "global_value" },
 *   mysection: { key1: "1", key2: "2" },
 * });
 * ```
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
 * Convert an object to an INI string.
 *
 * Since it takes an object, it does not support duplicate keys or sections.
 * This is the reverse of {@link parseObject} and uses {@link stringifyArray} under the hood.
 *
 * Global properties (entries before any section header) should be stored under
 * the empty string key `""`.
 *
 * @param obj The object to convert to an INI string.
 * @returns A promise resolving to the INI content as a string.
 *
 * @example Stringify object to INI
 * ```ts
 * import { stringifyObject } from "@hertzg/wg-ini";
 * import { assertEquals } from "@std/assert";
 *
 * const obj = {
 *   "": { global_key: "global_value" },
 *   mysection: { key1: "1", key2: "2" },
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

/**
 * Decode a text stream into INI sections.
 *
 * Transforms a stream of text chunks into a stream of {@link IniSection} objects.
 * The text is first split into lines, then parsed into INI line objects, and
 * finally grouped into sections.
 *
 * @param stream A readable stream of text chunks.
 * @returns A readable stream of INI section objects.
 *
 * @example Decode a text stream
 * ```ts
 * import { decodeTextStream } from "@hertzg/wg-ini";
 * import { assertEquals } from "@std/assert";
 *
 * const text = "[section]\nkey=value\n";
 * const stream = ReadableStream.from([text]);
 * const sections = await Array.fromAsync(decodeTextStream(stream));
 *
 * assertEquals(sections.length, 1);
 * assertEquals(sections[0].section?.$section, "section");
 * ```
 */
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

/**
 * Encode a stream of INI sections into text lines.
 *
 * Transforms a stream of {@link IniSection} objects into a stream of text lines.
 * Each section is expanded into its header line (if not global) followed by
 * its entry lines.
 *
 * @param stream A readable stream of INI section objects.
 * @returns A readable stream of text lines.
 *
 * @example Encode sections to text lines
 * ```ts
 * import { encodeSectionStream } from "@hertzg/wg-ini";
 * import type { IniSection } from "@hertzg/wg-ini/sections";
 * import { assertEquals } from "@std/assert";
 *
 * const sections: IniSection[] = [{
 *   section: { $section: "mysection" },
 *   entries: [{ $assign: ["key", "value"] as [string, string], $comment: null }],
 * }];
 * const stream = ReadableStream.from(sections);
 * const lines = await Array.fromAsync(encodeSectionStream(stream));
 *
 * assertEquals(lines, ["[mysection]", "key=value"]);
 * ```
 */
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
