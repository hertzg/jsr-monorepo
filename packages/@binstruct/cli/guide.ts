/**
 * Guidance rendering for the Binary Structure CLI.
 *
 * Every prefix of `binstruct [<package> [<coder> [<command>]]]` is a valid
 * invocation, and an incomplete one answers with the same three blocks
 * (ADR 0001):
 *
 * - **`NEXT`** — the missing word and one line on what it means.
 * - **an options block** — the legal values, each with its one-line doc.
 * - **`TRY`** — a paste-ready command one step further along.
 *
 * This module owns the shape of those blocks and nothing else. It performs no
 * I/O, spawns nothing and reads no arguments: {@linkcode renderGuide} turns a
 * {@linkcode Guide} into a string, and the caller decides whether that string
 * goes to stderr with exit 1 (an incomplete invocation) or to stdout with
 * exit 0 (`--help`). One renderer for all three levels is what keeps the two
 * from drifting.
 *
 * @module
 */

/** Width the options block wraps at, chosen to fit an 80-column terminal. */
const LINE_WIDTH = 76;

/** Indent applied to every line inside a block. */
const INDENT = "  ";

/** Blank columns between the name, detail and summary columns of an option. */
const GUTTER = "  ";

/**
 * One legal value of the missing word.
 *
 * A listing of bare names — the package list of level 0 — sets neither
 * {@linkcode GuideOption.detail} nor {@linkcode GuideOption.summary}, and is
 * flowed into columns instead of one row per name.
 */
export type GuideOption = {
  /** The word to type, e.g. `png`, `pngFile` or `decode`. */
  readonly name: string;
  /** Short annotation shown in its own column, e.g. `→ PngFile`. */
  readonly detail?: string;
  /** One-line description, e.g. the first line of the coder's JSDoc. */
  readonly summary?: string;
};

/**
 * The options block: every value the missing word may take.
 */
export type GuideOptions = {
  /** Block heading, e.g. `PACKAGES` or `CODERS in png`. */
  readonly heading: string;
  /** The legal values, in the order they should be shown. */
  readonly items: readonly GuideOption[];
  /** Line shown in place of an empty list, e.g. why discovery found nothing. */
  readonly empty?: string;
};

/**
 * The missing word and what it means.
 */
export type GuideNext = {
  /** The word, written as it appears in the usage line, e.g. `<coder>`. */
  readonly word: string;
  /** One line on what the word selects. */
  readonly meaning: string;
};

/**
 * Everything one guidance screen says.
 */
export type Guide = {
  /** First line, echoing the resolved specifier so shorthand is never invisible. */
  readonly header?: string;
  /** Lines shown before `NEXT`: what went wrong, or what was inferred. */
  readonly notes?: readonly string[];
  /** The missing word. */
  readonly next: GuideNext;
  /** The values that word may take. */
  readonly options: GuideOptions;
  /** Paste-ready commands one step further along. */
  readonly try?: readonly string[];
  /** Trailing lines, e.g. the usage recap `--help` adds. */
  readonly footer?: readonly string[];
};

/**
 * Flows bare names into columns that fit {@linkcode LINE_WIDTH}.
 *
 * @param names The names to lay out
 * @returns One string per rendered row
 */
function flowNames(names: readonly string[]): string[] {
  const cell = Math.max(...names.map((name) => name.length)) + GUTTER.length;
  const perRow = Math.max(1, Math.floor((LINE_WIDTH - INDENT.length) / cell));

  const rows: string[] = [];
  for (let start = 0; start < names.length; start += perRow) {
    const row = names.slice(start, start + perRow)
      .map((name) => name.padEnd(cell))
      .join("");
    rows.push((INDENT + row).trimEnd());
  }
  return rows;
}

/**
 * Lays out described options as aligned name, detail and summary columns.
 *
 * @param items The options to lay out
 * @returns One string per option
 */
function describeOptions(items: readonly GuideOption[]): string[] {
  const nameWidth = Math.max(...items.map((item) => item.name.length));
  const detailWidth = Math.max(
    ...items.map((item) => (item.detail ?? "").length),
  );

  return items.map((item) => {
    const detail = detailWidth === 0
      ? ""
      : GUTTER + (item.detail ?? "").padEnd(detailWidth);
    const summary = item.summary === undefined ? "" : GUTTER + item.summary;
    return (INDENT + item.name.padEnd(nameWidth) + detail + summary).trimEnd();
  });
}

/**
 * Renders the body of the options block.
 *
 * @param options The block to render
 * @returns One string per rendered row
 */
function renderOptions(options: GuideOptions): string[] {
  if (options.items.length === 0) {
    return [INDENT + (options.empty ?? "(none)")];
  }

  const bare = options.items.every((item) =>
    item.detail === undefined && item.summary === undefined
  );
  return bare
    ? flowNames(options.items.map((item) => item.name))
    : describeOptions(options.items);
}

/**
 * Renders a guidance screen.
 *
 * Blocks are separated by a blank line and the result carries no trailing
 * newline, so the caller can hand it straight to `console.error` or
 * `console.log`. The function is pure — the same {@linkcode Guide} always
 * renders the same string — which is what lets the disclosure levels, the
 * error paths and `--help` be tested without a process.
 *
 * @param guide The screen to render
 * @returns The rendered text, without a trailing newline
 *
 * @example The three blocks of an incomplete invocation
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { renderGuide } from "./guide.ts";
 *
 * const text = renderGuide({
 *   next: { word: "<command>", meaning: "what to do with the bytes" },
 *   options: {
 *     heading: "COMMANDS",
 *     items: [
 *       { name: "decode", summary: "binary on stdin to JSON on stdout" },
 *       { name: "encode", summary: "JSON on stdin to binary on stdout" },
 *     ],
 *   },
 *   try: ["binstruct arp decode < arp.bin > arp.json"],
 * });
 *
 * assertEquals(text.split("\n\n"), [
 *   "NEXT  <command>\n  what to do with the bytes",
 *   "COMMANDS\n  decode  binary on stdin to JSON on stdout\n" +
 *   "  encode  JSON on stdin to binary on stdout",
 *   "TRY\n  binstruct arp decode < arp.bin > arp.json",
 * ]);
 * ```
 *
 * @example Bare names are flowed into columns, and an empty list explains itself
 * ```ts
 * import { assertEquals, assertStringIncludes } from "@std/assert";
 * import { renderGuide } from "./guide.ts";
 *
 * const flowed = renderGuide({
 *   next: { word: "<package>", meaning: "the format package" },
 *   options: { heading: "PACKAGES", items: [{ name: "arp" }, { name: "png" }] },
 * });
 *
 * assertStringIncludes(flowed, "\n  arp  png");
 *
 * const empty = renderGuide({
 *   header: "package: jsr:@binstruct/pcap",
 *   next: { word: "<coder>", meaning: "the coder to run" },
 *   options: { heading: "CODERS", items: [], empty: "discovery is unavailable" },
 * });
 *
 * assertEquals(empty.split("\n")[0], "package: jsr:@binstruct/pcap");
 * assertStringIncludes(empty, "\n  discovery is unavailable");
 * ```
 */
export function renderGuide(guide: Guide): string {
  const blocks: string[][] = [];

  if (guide.header !== undefined) blocks.push([guide.header]);
  if (guide.notes !== undefined && guide.notes.length > 0) {
    blocks.push([...guide.notes]);
  }

  blocks.push([`NEXT  ${guide.next.word}`, INDENT + guide.next.meaning]);
  blocks.push([guide.options.heading, ...renderOptions(guide.options)]);

  if (guide.try !== undefined && guide.try.length > 0) {
    blocks.push(["TRY", ...guide.try.map((line) => INDENT + line)]);
  }
  if (guide.footer !== undefined && guide.footer.length > 0) {
    blocks.push([...guide.footer]);
  }

  return blocks.map((block) => block.join("\n")).join("\n\n");
}

/**
 * Levenshtein distance between two strings.
 *
 * @param a First string
 * @param b Second string
 * @returns Number of single-character edits separating them
 */
function editDistance(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);

  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    previous = current;
  }

  return previous[b.length];
}

/**
 * Picks the candidate closest to a misspelling, for a "did you mean" line.
 *
 * Comparison is case-insensitive, so `pngfile` finds `pngFile`, and a
 * candidate only counts as close when it is within roughly a third of the
 * typed word in edits — otherwise nothing is suggested rather than something
 * misleading. Ties go to the earliest candidate.
 *
 * @param input The word as typed
 * @param candidates The names that would have been accepted
 * @returns The nearest candidate, or `undefined` when none is close enough
 *
 * @example Case and small typos still find the intended name
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { nearestName } from "./guide.ts";
 *
 * const coders = ["pngFile", "pngChunkUnknown", "pngFileChunks"];
 *
 * assertEquals(nearestName("pngfile", coders), "pngFile");
 * assertEquals(nearestName("pngFiles", coders), "pngFile");
 * assertEquals(nearestName("totallyUnrelated", coders), undefined);
 * ```
 */
export function nearestName(
  input: string,
  candidates: Iterable<string>,
): string | undefined {
  const threshold = Math.max(2, Math.ceil(input.length / 3));
  const needle = input.toLowerCase();

  let best: string | undefined;
  let bestDistance = Infinity;

  for (const candidate of candidates) {
    const distance = editDistance(needle, candidate.toLowerCase());
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }

  return bestDistance <= threshold ? best : undefined;
}
