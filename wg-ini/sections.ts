import type {
  IniLine,
  IniLineAssign,
  IniLineComment,
  IniLineSection,
  IniLineTrailer,
} from "@hertzg/wg-ini/lines";

export type IniSection = {
  section: IniLineSection | null;
  entries: (IniLineAssign | IniLineComment | IniLineTrailer)[];
};

/**
 * A transform stream that decodes structured line objects of an INI file further into sections and their entries.
 * This builds upon the ini line decoder and groups lines into sections.
 *
 * The root section is represented by `null`, it is only emitted if there are entries in it otherwise empty root section is not emitted.
 *
 * @example
 * ```ts
 * import { IniSectionDecoderStream } from "@hertzg/wg-ini/sections";
 * import { assertEquals } from "@std/assert";
 *
 * const stream = ReadableStream.from([
 *  { $comment: " comment outside of section" },
 *  { $assign: ["global_key", "global_value "], $comment: " with comment" },
 *  { $trailer: "" },
 *  { $section: "mysection" },
 *  { $assign: ["key1", "1"] },
 *  { $assign: ["key2", "2"] },
 *  { $trailer: "" },
 *  { $section: "mysection", $trailer: " # and a comment" },
 *  { $assign: ["key1", "3"] },
 *  { $assign: ["key2", "4"] },
 *  { $trailer: "" }
 * ] as any).pipeThrough(new IniSectionDecoderStream());
 *
 * const sections = await Array.fromAsync(stream);
 *
 * assertEquals(sections, [{
 *   section: null,
 *   entries: [
 *     {$comment: " comment outside of section"},
 *     {$assign: ["global_key", "global_value "], $comment: " with comment"},
 *     {$trailer: ""},
 *   ]
 * }, {
 *   section: { $section: "mysection" },
 *   entries: [
 *     {$assign: ["key1", "1"]},
 *     {$assign: ["key2", "2"]},
 *     {$trailer: ""},
 *   ]
 * }, {
 *   section: { $section: "mysection", $trailer: " # and a comment" },
 *   entries: [
 *    {$assign: ["key1", "3"]},
 *    {$assign: ["key2", "4"]},
 *    {$trailer: ""},
 *   ]
 * }]);
 * ```
 */
export class IniSectionDecoderStream extends TransformStream<
  IniLine,
  IniSection
> {
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
 * A transform stream that encodes structured sections of an INI file (from {@link IniSectionDecoderStream}) back into structured ini line objects.
 *
 * @example
 * ```ts
 * import { IniSectionEncoderStream } from "@hertzg/wg-ini/sections";
 * import { assertEquals } from "@std/assert";
 *
 * const stream = ReadableStream.from([{
 *   section: null,
 *   entries: [
 *     {$comment: " comment outside of section"},
 *     {$assign: ["global_key", "global_value "], $comment: " with comment"},
 *     {$trailer: ""},
 *   ]
 * }, {
 *   section: { $section: "mysection" },
 *   entries: [
 *     {$assign: ["key1", "1"]},
 *     {$assign: ["key2", "2"]},
 *     {$trailer: ""},
 *   ]
 * }, {
 *   section: { $section: "mysection", $trailer: " # and a comment" },
 *   entries: [
 *    {$assign: ["key1", "3"]},
 *    {$assign: ["key2", "4"]},
 *    {$trailer: ""},
 *   ]
 * }] as any).pipeThrough(new IniSectionEncoderStream());
 *
 * const lines = await Array.fromAsync(stream);
 * assertEquals(lines, [
 *  { $comment: " comment outside of section" },
 *  { $assign: ["global_key", "global_value "], $comment: " with comment" },
 *  { $trailer: "" },
 *  { $section: "mysection" },
 *  { $assign: ["key1", "1"] },
 *  { $assign: ["key2", "2"] },
 *  { $trailer: "" },
 *  { $section: "mysection", $trailer: " # and a comment" },
 *  { $assign: ["key1", "3"] },
 *  { $assign: ["key2", "4"] },
 *  { $trailer: "" }
 * ]);
 * ```
 */
export class IniSectionEncoderStream extends TransformStream<
  IniSection,
  IniLine
> {
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
