/**
 * Transform streams for encoding and decoding individual lines of an INI file.
 *
 * This module provides low-level stream transformers that work with individual
 * lines of INI text. Use {@link IniLineDecoderStream} to parse text lines into
 * structured {@link IniLine} objects, and {@link IniLineEncoderStream} to convert
 * them back to text.
 *
 * For higher-level section-based processing, see the `sections` module.
 * For convenient parse/stringify functions, see the main module.
 *
 * @example Decode and encode INI lines
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { IniLineDecoderStream, IniLineEncoderStream } from "@hertzg/wg-ini/lines";
 *
 * const lines = ["[section]", "key=value"];
 * const decoded = await Array.fromAsync(
 *   ReadableStream.from(lines).pipeThrough(new IniLineDecoderStream())
 * );
 *
 * assertEquals(decoded, [
 *   { $section: "section", $trailer: "" },
 *   { $assign: ["key", "value"], $comment: null },
 * ]);
 *
 * const encoded = await Array.fromAsync(
 *   ReadableStream.from(decoded).pipeThrough(new IniLineEncoderStream())
 * );
 *
 * assertEquals(encoded, lines);
 * ```
 *
 * @module
 */

/**
 * Configuration options for {@link IniLineDecoderStream}.
 */
export interface IniLineDecoderStreamOptions {
  /** Delimiter for comments (default: `"#"`). */
  commentDelimiter?: string;
  /** Delimiter for section start (default: `"["`). */
  sectionStartDelimiter?: string;
  /** Delimiter for section end (default: `"]"`). */
  sectionEndDelimiter?: string;
  /** Delimiter for key-value pairs (default: `"="`). */
  keyValueDelimiter?: string;
}

/**
 * Represents an INI section header line (e.g., `[section]`).
 *
 * The `$section` property contains the section name without brackets.
 * The optional `$trailer` contains any text after the closing bracket.
 */
export type IniLineSection = { $section: string; $trailer?: string };

/**
 * Represents an INI key-value assignment line (e.g., `key=value`).
 *
 * The `$assign` property is a tuple of `[key, value]`.
 * The optional `$comment` contains any inline comment after the value,
 * or `null` if no comment delimiter was found.
 */
export type IniLineAssign = {
  $assign: [string, string];
  $comment?: string | null;
};

/**
 * Represents an INI comment line (e.g., `# comment`).
 *
 * The `$comment` property contains the comment text without the delimiter.
 */
export type IniLineComment = { $comment: string };

/**
 * Represents an INI trailer line (empty lines or unrecognized content).
 *
 * The `$trailer` property contains the raw line content.
 */
export type IniLineTrailer = { $trailer: string };

/**
 * Union type for all INI line types.
 *
 * Each line in an INI file is parsed into one of these types:
 * - {@link IniLineSection}: Section headers like `[section]`
 * - {@link IniLineAssign}: Key-value pairs like `key=value`
 * - {@link IniLineComment}: Comment lines like `# comment`
 * - {@link IniLineTrailer}: Empty lines or unrecognized content
 */
export type IniLine =
  | IniLineSection
  | IniLineAssign
  | IniLineComment
  | IniLineTrailer;

/**
 * A transform stream that decodes lines of an INI file into structured objects.
 *
 * Parses each input line and emits one of four line types:
 * - {@link IniLineComment}: Lines starting with the comment delimiter
 * - {@link IniLineSection}: Lines with section brackets (e.g., `[section]`)
 * - {@link IniLineAssign}: Lines with key-value pairs (e.g., `key=value`)
 * - {@link IniLineTrailer}: Empty lines or unrecognized content
 *
 * Since this processes line by line, it preserves duplicate keys and sections.
 * Input chunks are expected to be individual lines of text (use `TextLineStream`
 * to split text into lines first).
 *
 * @example Decode INI lines with various content types
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { IniLineDecoderStream } from "@hertzg/wg-ini/lines";
 *
 * const stream = ReadableStream.from([
 *   "# comment outside of section",
 *   "global_key=global_value # with comment",
 *   "duplicated=key",
 *   "duplicated=with other value",
 *   "[empty]",
 *   "[section with spaces] # and a comment",
 *   "key1=1",
 *   "key2=2",
 *   "[duplicated section]",
 *   "key1=1",
 *   "[duplicated section]",
 *   "key1=2",
 * ]).pipeThrough(new IniLineDecoderStream());
 *
 * const lines = await Array.fromAsync(stream);
 *
 * assertEquals(lines, [
 *   { $comment: " comment outside of section" },
 *   { $assign: ["global_key", "global_value "], $comment: " with comment" },
 *   { $assign: ["duplicated", "key"], $comment: null },
 *   { $assign: ["duplicated", "with other value"], $comment: null },
 *   { $section: "empty", $trailer: "" },
 *   { $section: "section with spaces", $trailer: " # and a comment" },
 *   { $assign: ["key1", "1"], $comment: null },
 *   { $assign: ["key2", "2"], $comment: null },
 *   { $section: "duplicated section", $trailer: "" },
 *   { $assign: ["key1", "1"], $comment: null },
 *   { $section: "duplicated section", $trailer: "" },
 *   { $assign: ["key1", "2"], $comment: null },
 * ]);
 * ```
 */
export class IniLineDecoderStream extends TransformStream<string, IniLine> {
  /**
   * Create a new INI line decoder stream.
   *
   * @param options Configuration options for parsing delimiters.
   */
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

/**
 * Configuration options for {@link IniLineEncoderStream}.
 */
export interface IniLineEncoderStreamOptions {
  /** Delimiter for comments (default: `"#"`). */
  commentDelimiter?: string;
  /** Delimiter for section start (default: `"["`). */
  sectionStartDelimiter?: string;
  /** Delimiter for section end (default: `"]"`). */
  sectionEndDelimiter?: string;
  /** Delimiter for key-value pairs (default: `"="`). */
  keyValueDelimiter?: string;
}

/**
 * A transform stream that encodes INI line objects back into text lines.
 *
 * This is the reverse of {@link IniLineDecoderStream}. It converts structured
 * {@link IniLine} objects back into their string representation, preserving
 * comments and trailers.
 *
 * @example Encode INI line objects to text
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { IniLineEncoderStream, type IniLine } from "@hertzg/wg-ini/lines";
 *
 * const stream = ReadableStream.from([
 *   { $comment: " comment outside of section" },
 *   { $assign: ["global_key", "global_value "], $comment: " with comment" },
 *   { $trailer: "" },
 *   { $section: "mysection" },
 *   { $assign: ["key1", "1"] },
 *   { $assign: ["key2", "2"] },
 *   { $trailer: "" },
 *   { $section: "mysection", $trailer: " # and a comment" },
 *   { $assign: ["key1", "3"] },
 *   { $assign: ["key2", "4"] },
 *   { $trailer: "" },
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
  /**
   * Create a new INI line encoder stream.
   *
   * @param options Configuration options for encoding delimiters.
   */
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
