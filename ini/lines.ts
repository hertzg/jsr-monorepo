/**
 * Transform streams for encoding and decoding lines of an INI file.
 *
 * See {@link IniLineDecoderStream} and {@link IniLineEncoderStream} for more information.
 *
 * @module
 */
export interface IniLineDecoderStreamOptions {
  commentDelimiter?: string;
  sectionStartDelimiter?: string;
  sectionEndDelimiter?: string;
  keyValueDelimiter?: string;
}

export type IniLineSection = { $section: string; $trailer?: string };
export type IniLineAssign = {
  $assign: [string, string];
  $comment?: string | null;
};
export type IniLineComment = { $comment: string };
export type IniLineTrailer = { $trailer: string };
export type IniLine =
  | IniLineSection
  | IniLineAssign
  | IniLineComment
  | IniLineTrailer;

/**
 * A transform stream that decodes lines of an INI file into structured objects.
 * Differentiates between comments, sections, key-value pairs, and trailers.
 *
 * Comments are lines that start with a comment delimiter.
 * Sections are lines that start with a section start delimiter, contain a section end delimiter, and may have a trailer (comment).
 * Key-value pairs are lines that contain a key-value delimiter and may have a comment.
 * Trailers are lines that do not match any of the above (eg: spaces in between sections and/or key-value pairs).
 *
 * Since this processes stream line by line, it can handle duplicate keys and duplicate sections as well as their comments.
 *
 * This stream chunks are expected to be lines of text.
 *
 * @example INI Lines
 * ```ts
 * import { TextLineStream } from "@std/streams";
 * import { assertEquals } from "@std/assert";
 * import { IniLineDecoderStream } from "@hertzg/wg-ini/lines";
 *
 * const stream = ReadableStream.from([
 *  "# comment outside of section",
 *  "global_key=global_value # with comment",
 *  "duplicated=key",
 *  "duplicated=with other value",
 *  "[empty]",
 *  "[section with spaces] # and a comment",
 *  "key1=1",
 *  "key2=2",
 *  "[duplicated section]",
 *  "key1=1",
 *  "[duplicated section]",
 *  "key1=2"
 * ]).pipeThrough(new IniLineDecoderStream());
 *
 * const lines = await Array.fromAsync(stream);
 *
 * assertEquals(lines, [
 *   { $comment: " comment outside of section" },
 *   {
 *     $assign: ["global_key", "global_value "],
 *     $comment: " with comment",
 *   },
 *   {
 *     $assign: ["duplicated", "key"],
 *     $comment: null,
 *   },
 *   {
 *     $assign: ["duplicated", "with other value"],
 *     $comment: null,
 *   },
 *   {
 *     $section: "empty",
 *     $trailer: "",
 *   },
 *   {
 *     $section: "section with spaces",
 *     $trailer: " # and a comment",
 *   },
 *   {
 *     $assign: ["key1", "1"],
 *     $comment: null,
 *   },
 *   {
 *     $assign: ["key2", "2"],
 *     $comment: null,
 *   },
 *   {
 *     $section: "duplicated section",
 *     $trailer: "",
 *   },
 *   {
 *     $assign: ["key1", "1"],
 *     $comment: null,
 *   },
 *   {
 *     $section: "duplicated section",
 *     $trailer: "",
 *   },
 *   {
 *     $assign: ["key1", "2"],
 *     $comment: null,
 *   }
 * ]);
 * ```
 */
export class IniLineDecoderStream extends TransformStream<string, IniLine> {
  constructor(options: IniLineDecoderStreamOptions = {}) {
    const {
      commentDelimiter = "#",
      sectionStartDelimiter = "[",
      sectionEndDelimiter = "]",
      keyValueDelimiter = "=",
    } = options;

    super({
      transform(
        line: string,
        controller: TransformStreamDefaultController<IniLine>,
      ) {
        const trimmed = line.trim();
        if (
          trimmed.startsWith(commentDelimiter)
        ) {
          controller.enqueue({ $comment: line.slice(1) });
        } else if (
          trimmed.startsWith(sectionStartDelimiter) &&
          trimmed.includes(sectionEndDelimiter)
        ) {
          const indexOfStart = line.indexOf(sectionStartDelimiter);
          const indexOfEnd = line.indexOf(sectionEndDelimiter, indexOfStart);
          const sectionName = line.slice(indexOfStart + 1, indexOfEnd);
          const trailer = trimmed.slice(indexOfEnd + 1);
          controller.enqueue({ $section: sectionName, $trailer: trailer });
        } else if (line.includes(keyValueDelimiter)) {
          const [key, ...rest] = line.split(keyValueDelimiter);
          const [value, ...comment] = rest.join(keyValueDelimiter).split(
            commentDelimiter,
          );
          controller.enqueue({
            $assign: [key, value],
            $comment: comment.length && comment.join(commentDelimiter) || null,
          });
        } else {
          controller.enqueue({ $trailer: line });
        }
      },
    });
  }
}

export interface IniLineEncoderStreamOptions {
  commentDelimiter?: string;
  sectionStartDelimiter?: string;
  sectionEndDelimiter?: string;
  keyValueDelimiter?: string;
}

/**
 * A transform stream that encodes ini line structured objects (back) into lines of an INI file.
 * This does the opposite of {@link IniLineDecoderStream} while trying to maintain the original format.
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { IniLineEncoderStream, type IniLine } from "@hertzg/wg-ini/lines";
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
 * ] as IniLine[]).pipeThrough(new IniLineEncoderStream());
 *
 * const lines = await Array.fromAsync(stream);
 * assertEquals(lines, [
 *   "# comment outside of section",
 *   "global_key=global_value # with comment",
 *   "",
 *   "[mysection]",
 *   "key1=1",
 *   "key2=2",
 *   "",
 *   "[mysection] # and a comment",
 *   "key1=3",
 *   "key2=4",
 *   "",
 * ]);
 * ```
 */
export class IniLineEncoderStream extends TransformStream<IniLine, string> {
  constructor(options: IniLineEncoderStreamOptions = {}) {
    const {
      commentDelimiter = "#",
      sectionStartDelimiter = "[",
      sectionEndDelimiter = "]",
      keyValueDelimiter = "=",
    } = options;

    super({
      transform(
        line: IniLine,
        controller: TransformStreamDefaultController<string>,
      ) {
        if ("$section" in line) {
          controller.enqueue(
            `${sectionStartDelimiter}${line.$section}${sectionEndDelimiter}${
              line.$trailer ?? ""
            }`,
          );
        } else if ("$assign" in line) {
          controller.enqueue(
            `${line.$assign[0]}${keyValueDelimiter}${line.$assign[1]}${
              line.$comment != null ? `${commentDelimiter}${line.$comment}` : ""
            }`,
          );
        } else if ("$comment" in line) {
          controller.enqueue(`${commentDelimiter}${line.$comment}`);
        } else if ("$trailer" in line) {
          controller.enqueue(line.$trailer);
        }
      },
    });
  }
}
