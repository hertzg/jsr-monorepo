/**
 * Transform streams for grouping INI lines into sections.
 *
 * This module provides stream transformers that work with {@link IniSection}
 * objects. Use {@link IniSectionDecoderStream} to group decoded INI lines
 * into sections, and {@link IniSectionEncoderStream} to flatten sections
 * back into individual lines.
 *
 * For line-level processing, see the `lines` module.
 * For convenient parse/stringify functions, see the main module.
 *
 * @example Group lines into sections
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { IniSectionDecoderStream } from "@hertzg/wg-ini/sections";
 * import type { IniLine } from "@hertzg/wg-ini/lines";
 *
 * const lines: IniLine[] = [
 *   { $assign: ["global", "value"], $comment: null },
 *   { $section: "mysection", $trailer: "" },
 *   { $assign: ["key", "value"], $comment: null },
 * ];
 *
 * const sections = await Array.fromAsync(
 *   ReadableStream.from(lines).pipeThrough(new IniSectionDecoderStream())
 * );
 *
 * assertEquals(sections.length, 2);
 * assertEquals(sections[0].section, null);
 * assertEquals(sections[0].entries.length, 1);
 * assertEquals(sections[1].section?.$section, "mysection");
 * assertEquals(sections[1].entries.length, 1);
 * ```
 *
 * @module
 */

import type {
  IniLine,
  IniLineAssign,
  IniLineComment,
  IniLineSection,
  IniLineTrailer,
} from "./lines.ts";

/**
 * Represents an INI section with its header and entries.
 *
 * A section groups related INI lines together. The `section` property contains
 * the section header (or `null` for the global section), and `entries` contains
 * all lines that belong to this section (assignments, comments, and trailers).
 */
export type IniSection = {
  /** The section header, or `null` for the global section. */
  section: IniLineSection | null;
  /** Lines belonging to this section (assignments, comments, trailers). */
  entries: (IniLineAssign | IniLineComment | IniLineTrailer)[];
};

/**
 * A transform stream that groups INI lines into sections.
 *
 * Takes a stream of {@link IniLine} objects (from {@link IniLineDecoderStream})
 * and groups them into {@link IniSection} objects. Each section contains a
 * header and all entries until the next section header.
 *
 * The global section (lines before any `[section]` header) uses `null` for the
 * section property. It is only emitted if it contains entries.
 *
 * @example Group INI lines into sections
 * ```ts
 * import { IniSectionDecoderStream } from "@hertzg/wg-ini/sections";
 * import { assertEquals } from "@std/assert";
 * import type { IniLine } from "@hertzg/wg-ini/lines";
 *
 * const lines: IniLine[] = [
 *   { $comment: " comment outside of section" },
 *   { $assign: ["global_key", "global_value "], $comment: " with comment" },
 *   { $trailer: "" },
 *   { $section: "mysection", $trailer: "" },
 *   { $assign: ["key1", "1"], $comment: null },
 *   { $assign: ["key2", "2"], $comment: null },
 *   { $trailer: "" },
 *   { $section: "mysection", $trailer: " # and a comment" },
 *   { $assign: ["key1", "3"], $comment: null },
 *   { $assign: ["key2", "4"], $comment: null },
 *   { $trailer: "" },
 * ];
 *
 * const stream = ReadableStream.from(lines).pipeThrough(
 *   new IniSectionDecoderStream()
 * );
 * const sections = await Array.fromAsync(stream);
 *
 * assertEquals(sections, [
 *   {
 *     section: null,
 *     entries: [
 *       { $comment: " comment outside of section" },
 *       { $assign: ["global_key", "global_value "], $comment: " with comment" },
 *       { $trailer: "" },
 *     ],
 *   },
 *   {
 *     section: { $section: "mysection", $trailer: "" },
 *     entries: [
 *       { $assign: ["key1", "1"], $comment: null },
 *       { $assign: ["key2", "2"], $comment: null },
 *       { $trailer: "" },
 *     ],
 *   },
 *   {
 *     section: { $section: "mysection", $trailer: " # and a comment" },
 *     entries: [
 *       { $assign: ["key1", "3"], $comment: null },
 *       { $assign: ["key2", "4"], $comment: null },
 *       { $trailer: "" },
 *     ],
 *   },
 * ]);
 * ```
 */
export class IniSectionDecoderStream extends TransformStream<
  IniLine,
  IniSection
> {
  /**
   * Create a new INI section decoder stream.
   */
  constructor() {
    let section: IniSection = { section: null, entries: [] };
    super({
      transform(
        iniLine: IniLine,
        controller: TransformStreamDefaultController<IniSection>,
      ) {
        if ("$section" in iniLine) {
          if (section.section !== null || section.entries.length > 0) {
            controller.enqueue(section);
          }
          section = { section: iniLine, entries: [] };
        } else {
          section.entries.push(iniLine);
        }
      },
      flush(controller: TransformStreamDefaultController<IniSection>) {
        if (section.section !== null || section.entries.length > 0) {
          controller.enqueue(section);
        }
      },
    });
  }
}

/**
 * A transform stream that flattens INI sections back into individual lines.
 *
 * This is the reverse of {@link IniSectionDecoderStream}. It takes a stream of
 * {@link IniSection} objects and emits their lines in order: section header
 * (if not global) followed by all entries.
 *
 * @example Flatten sections to INI lines
 * ```ts
 * import { IniSectionEncoderStream, type IniSection } from "@hertzg/wg-ini/sections";
 * import { assertEquals } from "@std/assert";
 *
 * const sections: IniSection[] = [
 *   {
 *     section: null,
 *     entries: [
 *       { $comment: " comment outside of section" },
 *       { $assign: ["global_key", "global_value "], $comment: " with comment" },
 *       { $trailer: "" },
 *     ],
 *   },
 *   {
 *     section: { $section: "mysection" },
 *     entries: [
 *       { $assign: ["key1", "1"], $comment: null },
 *       { $assign: ["key2", "2"], $comment: null },
 *       { $trailer: "" },
 *     ],
 *   },
 *   {
 *     section: { $section: "mysection", $trailer: " # and a comment" },
 *     entries: [
 *       { $assign: ["key1", "3"], $comment: null },
 *       { $assign: ["key2", "4"], $comment: null },
 *       { $trailer: "" },
 *     ],
 *   },
 * ];
 *
 * const stream = ReadableStream.from(sections).pipeThrough(
 *   new IniSectionEncoderStream()
 * );
 * const lines = await Array.fromAsync(stream);
 *
 * assertEquals(lines, [
 *   { $comment: " comment outside of section" },
 *   { $assign: ["global_key", "global_value "], $comment: " with comment" },
 *   { $trailer: "" },
 *   { $section: "mysection" },
 *   { $assign: ["key1", "1"], $comment: null },
 *   { $assign: ["key2", "2"], $comment: null },
 *   { $trailer: "" },
 *   { $section: "mysection", $trailer: " # and a comment" },
 *   { $assign: ["key1", "3"], $comment: null },
 *   { $assign: ["key2", "4"], $comment: null },
 *   { $trailer: "" },
 * ]);
 * ```
 */
export class IniSectionEncoderStream extends TransformStream<
  IniSection,
  IniLine
> {
  /**
   * Create a new INI section encoder stream.
   */
  constructor() {
    super({
      transform(
        section: IniSection,
        controller: TransformStreamDefaultController<IniLine>,
      ) {
        if (section.section !== null) {
          controller.enqueue(section.section);
        }

        for (const entry of section.entries) {
          controller.enqueue(entry);
        }
      },
    });
  }
}
