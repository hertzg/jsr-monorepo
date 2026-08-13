#!/usr/bin/env -S deno run -A

/**
 * Binary Structure CLI Tool
 *
 * Decodes and encodes binary data with any binstruct package, reading stdin and
 * writing stdout so it drops into a pipeline. Decoded structures leave as
 * **JSON5** — quoted-where-needed keys, `0x` byte literals and `// |ascii|`
 * comments — which is what `encode` reads back.
 *
 * The argument list is a prefix chain, and every prefix of it is a valid
 * invocation (ADR 0001):
 *
 * ```
 * binstruct [--] [<package> [<coder> [<command>]]] [options]
 * ```
 *
 * A prefix that stops short prints guidance for the missing word — what it
 * means, the values it may take, and a paste-ready command one step further
 * along — to **stderr**, and exits **1**. `--help` prints the same material to
 * **stdout** and exits **0**. Stdout otherwise carries the payload and nothing
 * else, so a half-typed `binstruct png > out.json5` leaves `out.json5` empty
 * instead of filling it with a help screen.
 *
 * A bare package name means the `@binstruct` scope on JSR (ADR 0004), and a
 * package exposing exactly one zero-argument coder may omit the `<coder>` word
 * (ADR 0005).
 *
 * The `PACKAGES` block is JSR's own scope listing, fetched and cached for a day
 * (`./scope.ts`, ADR 0006), so it names what is published rather than what was
 * published when this CLI was released. That costs `--allow-net=jsr.io`; the
 * listing is a hint, so without the permission, without a network, or against a
 * JSR that will not answer, the block is omitted and the screen still says how
 * to name a package. Listing the *coders* of a package costs
 * `--allow-run=deno` in the same way (ADR 0002) — but that listing is not only
 * a hint, since it also says how many arguments each factory takes. Without it
 * a coder you name is accepted, and then refused unless its factory takes no
 * arguments at runtime: the CLI has none to pass, and calling one that wanted
 * some lets the argument default silently.
 *
 * @example Decode a PNG file
 * ```bash
 * binstruct png pngFile decode < input.png > struct.json5
 * ```
 *
 * @example The coder word is optional when a package has only one
 * ```bash
 * binstruct arp decode < arp.bin > arp.json5
 * ```
 *
 * @example A local package is named by its module file, never by its directory
 * ```bash
 * binstruct ./my-package/mod.ts decode < input.bin > output.json5
 * ```
 *
 * @example `--` ends the flags, for a package word that starts with one
 * ```bash
 * binstruct -- -dash/mod.ts decode < input.bin > output.json5
 * ```
 *
 * @module
 */

import { parseArgs } from "@std/cli";
import { decodeCommand } from "./commands/decode.ts";
import { encodeCommand } from "./commands/encode.ts";
import { UnverifiedArityError } from "./loader.ts";
import {
  diagnoseEmptyDiscovery,
  discoverCoders,
  type DiscoveredCoder,
  readSymbolDocs,
  type SymbolDocsOutcome,
  type ToolFailure,
} from "./discover.ts";
import {
  type Guide,
  metavariable,
  nearestName,
  renderGuide,
  shellWord,
} from "./guide.ts";
import {
  listScopePackages,
  type ScopeListing,
  type ScopePackage,
} from "./scope.ts";
import { type ResolvedSpecifier, resolveSpecifier } from "./specifier.ts";
import { inspectLocalTarget, type LocalTarget } from "./target.ts";

/** How the tool is spelled in every example it prints. */
const PROGRAM = "binstruct";

/** Package used in the level 0 `TRY` line, where nothing has been typed yet. */
const SAMPLE_PACKAGE = "png";

/** Reported by `--version`. */
const VERSION_LINE = "@binstruct/cli v0.2.0";

/** The commands, which are also reserved words in the second positional. */
const COMMANDS = [
  { name: "decode", summary: "binary on stdin → JSON5 on stdout" },
  { name: "encode", summary: "JSON5 on stdin → binary on stdout" },
] as const;

/** Recap of the calling convention, appended to every `--help` screen. */
const USAGE_FOOTER: readonly string[] = [
  "USAGE",
  `  ${PROGRAM} [--] [<package> [<coder> [<command>]]] [options]`,
  "",
  "OPTIONS",
  "  -p, --package <package>  same as the first positional",
  "  -c, --coder <coder>      same as the second positional",
  "      --docs               print `deno doc` for the chosen coder",
  "  -h, --help               print this guidance on stdout and exit 0",
  "  -v, --version            print the version",
  "      --                   ends the flags; every later word is a positional",
  "",
  "NOTES",
  `  a bare <package> means jsr:@binstruct/<package>`,
  `  a local <package> names a module file, not a directory: ./${SAMPLE_PACKAGE}/mod.ts`,
  `  a <package> starting with '-' needs the separator: ${PROGRAM} -- -pkg/mod.ts`,
  "  the payload is JSON5, not JSON: quoted keys, 0x byte literals, comments",
  "  without --help, guidance goes to stderr and exits 1, so a half-typed",
  "  redirect stays empty",
  "",
  "PERMISSIONS",
  "  --allow-net=jsr.io  lists the @binstruct packages, live and cached for a",
  "                      day; without it the list is omitted, nothing else",
  "  --allow-run=deno    lists the coders of a package, via deno doc, and reads",
  "                      how many arguments each one takes; without it a coder",
  "                      you name runs only when its factory takes none at",
  "                      runtime, and is refused rather than called otherwise",
];

/**
 * A command the CLI can carry out.
 */
export type CommandName = (typeof COMMANDS)[number]["name"];

/**
 * CLI configuration options.
 *
 * Every positional is optional, because every prefix of the argument list is a
 * valid invocation; a missing value is `undefined` and makes the run
 * incomplete rather than invalid.
 */
export interface CliOptions {
  /** Package specifier as typed, before {@linkcode resolveSpecifier}. */
  readonly package: string | undefined;
  /** Coder name, absent when it is to be inferred or asked for. */
  readonly coder: string | undefined;
  /** Command word, absent when it is to be asked for. */
  readonly command: string | undefined;
  /** Print guidance to stdout and exit 0 instead of to stderr and exit 1. */
  readonly help: boolean;
  /** Print version information. */
  readonly version: boolean;
  /** Print `deno doc` output for the chosen coder instead of running it. */
  readonly docs: boolean;
  /**
   * Flags the parser was given and does not know, as typed.
   *
   * Not an aside: an unrecognised flag consumes a word, so the positionals
   * behind it shift and a different word becomes the package. Nothing runs
   * while this is non-empty.
   */
  readonly unknownFlags: readonly string[];
  /**
   * Slots filled with a word that says nothing, named as `<package>` and so on.
   *
   * A blank argument is still an argument. Dropping it made the words after it
   * mean something else — `binstruct "" decode` read `decode` as the package —
   * which is the shift an unknown flag causes, by another route. Nothing runs
   * while this is non-empty.
   */
  readonly blankSlots: readonly string[];
  /**
   * Positionals beyond the third, as typed.
   *
   * There are three slots and no fourth. A word past them was discarded in
   * silence, so `binstruct arp arpData decode input.bin` — a forgotten `<` —
   * sat reading a terminal with nothing to say it had ignored the file.
   */
  readonly extraArgs: readonly string[];
}

/**
 * What an invocation amounts to, once its arguments are understood.
 *
 * Splitting the decision from its effects is what makes the guidance testable:
 * every disclosure level, every error path and `--help` produce a `print` plan
 * whose text, stream and exit code can be asserted without a process.
 */
export type CliPlan =
  | {
    /** Discriminant: this plan only writes text. */
    readonly kind: "print";
    /** The text to write, without a trailing newline. */
    readonly text: string;
    /** Where it goes; guidance never touches stdout unless asked by `--help`. */
    readonly stream: "stdout" | "stderr";
    /** Exit status; non-zero means the invocation was incomplete or wrong. */
    readonly code: number;
    /**
     * Lines to write to stderr first, for text that goes to stdout and must
     * not carry them: the resolved specifier, and any inferred coder. A guide
     * carries its own header instead, and leaves this empty.
     */
    readonly notices?: readonly string[];
  }
  | {
    /** Discriminant: this plan runs a coder over stdin. */
    readonly kind: "run";
    /**
     * The resolved module specifier to import, which is exactly the one
     * discovery was asked about — it names a single module, so there is
     * nothing to substitute.
     */
    readonly specifier: string;
    /** Coder factory to call, whether named or inferred. */
    readonly coder: string;
    /** What to do with the bytes. */
    readonly command: CommandName;
    /**
     * Whether discovery read the factory's parameter list.
     *
     * `false` means the name was taken on trust because discovery was
     * unavailable, and the run must fall back to checking the factory's
     * runtime arity before calling it (`./loader.ts`).
     */
    readonly arityVerified: boolean;
    /** Lines to write to stderr first: the resolved specifier, any inference. */
    readonly notices: readonly string[];
  };

/**
 * The coder a run will use, or the guidance that replaces it.
 *
 * The successful shape carries what discovery learned on the way — the
 * package's description and the coder's decoded type — because every screen
 * downstream of the choice wants one or the other and neither is worth a
 * second subprocess.
 */
type CoderChoice =
  | {
    readonly ok: true;
    readonly name: string;
    readonly inferred: boolean;
    /**
     * Whether the name came with a declaration-level parameter count.
     *
     * Only a choice discovery made carries one. A name taken on trust does
     * not, and the run it produces has to check the factory's runtime arity
     * itself before calling it.
     */
    readonly arityVerified: boolean;
    /** The `T` of `Coder<T>`, when discovery could name it. */
    readonly decodedType?: string;
    /** First line of the package's module doc, when it has one. */
    readonly summary?: string;
  }
  | { readonly ok: false; readonly guide: Guide };

/**
 * Reports whether a word is one of the commands.
 *
 * @param word The word to test
 * @returns Whether it names a command
 */
function isCommandName(word: string): word is CommandName {
  return COMMANDS.some((command) => command.name === word);
}

/**
 * Reports whether a slot value says anything at all.
 *
 * @param value The word as typed
 * @returns Whether it holds something other than whitespace
 */
function spoken(value: string): boolean {
  return value.trim().length > 0;
}

/** The three slots, in the order positionals fill them. */
const SLOT_WORDS = ["<package>", "<coder>", "<command>"] as const;

/**
 * Colour escapes, which `deno` emits on stderr even when it is piped.
 */
const ANSI_PATTERN = new RegExp(String.fromCharCode(27) + "[[][0-9;]*m", "g");

/**
 * Returns the first non-empty line of a block of text, without colour escapes.
 *
 * @param text The text to summarize
 * @returns The first line with content, or `undefined` when there is none
 */
function firstLine(text: string): string | undefined {
  return text.replace(ANSI_PATTERN, "").split("\n").map((line) => line.trim())
    .find((line) => line.length > 0);
}

/**
 * Parses command line arguments into the three positionals and the flags.
 *
 * Positionals fill the package, coder and command slots in order, skipping any
 * slot a flag already filled — so `-p png -c pngFile decode` and
 * `png pngFile decode` mean the same thing. `decode` and `encode` are reserved
 * in the coder slot: a second word that names a command *is* the command, and
 * the coder is left to be inferred (ADR 0005).
 *
 * Every slot is text: positionals are read as strings, so `007` stays `007`
 * rather than becoming the number `7` on its way to the specifier resolver.
 *
 * **A blank word fills its slot, and is then refused on its own terms.** It
 * used to be dropped as if it had never been typed, which is not a smaller
 * version of the same thing: `binstruct "" decode` slid `decode` into the
 * package slot and answered confidently about `jsr:@binstruct/decode`, and
 * `-p ""` did it too. That is the shift an unknown flag causes, arriving by
 * another route, and it takes the same answer — the slots it landed in are
 * named in {@linkcode CliOptions.blankSlots} and nothing runs.
 *
 * **There is no fourth slot, and a word that reaches for one is refused.**
 * Extra positionals used to be dropped where they stood, so
 * `binstruct arp arpData decode input.bin` — the `<` forgotten — waited on a
 * terminal for input that was sitting in the file it had just discarded. They
 * are collected in {@linkcode CliOptions.extraArgs} instead.
 *
 * **A word starting with `-` is a flag, and `--` is how you say it is not.**
 * Everything after the separator fills a slot whatever it starts with, so
 * `binstruct -- -dash/mod.ts decode` names a module the shell tab-completed
 * from a directory called `-dash`. Without it, `-dash/` was read as the flag
 * cluster `-d -a -s -h`, whose `h` set `--help` — and the CLI answered a decode
 * with the whole help screen **on stdout, at exit 0**, which is precisely the
 * redirect corruption ADR 0001 exists to prevent.
 *
 * **A flag that is not recognised is refused, never ignored.** Only the five
 * declared here exist; anything else consumes a word and shifts every
 * positional behind it, so `binstruct --format json png` would have answered
 * confidently about `json`. They are collected rather than thrown, since
 * reporting them is {@linkcode planCli}'s job.
 *
 * @param args Command line arguments
 * @returns The parsed slots and flags, with absent and blank values left `undefined`
 *
 * @example Positionals and flags are interchangeable
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseCliArgs } from "./cli.ts";
 *
 * assertEquals(parseCliArgs(["png", "pngFile", "decode"]), {
 *   package: "png",
 *   coder: "pngFile",
 *   command: "decode",
 *   help: false,
 *   version: false,
 *   docs: false,
 *   unknownFlags: [],
 *   blankSlots: [],
 *   extraArgs: [],
 * });
 *
 * const flagged = parseCliArgs(["-p", "png", "-c", "pngFile", "decode"]);
 *
 * assertEquals(flagged.package, "png");
 * assertEquals(flagged.coder, "pngFile");
 * assertEquals(flagged.command, "decode");
 * ```
 *
 * @example A command word in the coder slot leaves the coder to be inferred
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseCliArgs } from "./cli.ts";
 *
 * const options = parseCliArgs(["arp", "decode"]);
 *
 * assertEquals(options.package, "arp");
 * assertEquals(options.coder, undefined);
 * assertEquals(options.command, "decode");
 * ```
 *
 * @example `--` makes a leading dash ordinary, and a stray flag is reported
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseCliArgs } from "./cli.ts";
 *
 * const separated = parseCliArgs(["--", "-dash/mod.ts", "decode"]);
 *
 * assertEquals(separated.package, "-dash/mod.ts");
 * assertEquals(separated.command, "decode");
 * assertEquals(separated.help, false);
 *
 * assertEquals(parseCliArgs(["--format", "json", "png"]).unknownFlags, [
 *   "--format",
 * ]);
 * ```
 *
 * @example A blank word keeps its slot, and a fourth word is kept as well
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseCliArgs } from "./cli.ts";
 *
 * const blank = parseCliArgs(["", "decode"]);
 *
 * assertEquals(blank.package, "");
 * assertEquals(blank.command, "decode");
 * assertEquals(blank.blankSlots, ["<package>"]);
 *
 * const extra = parseCliArgs(["arp", "arpData", "decode", "input.bin"]);
 *
 * assertEquals(extra.command, "decode");
 * assertEquals(extra.extraArgs, ["input.bin"]);
 * ```
 */
export function parseCliArgs(args: string[]): CliOptions {
  const unknownFlags: string[] = [];

  const parsed = parseArgs(args, {
    string: ["_", "package", "coder"],
    boolean: ["help", "version", "docs"],
    alias: { package: "p", coder: "c", help: "h", version: "v" },
    unknown: (arg: string, key?: string) => {
      // Called for positionals too, with no key; those are not flags. A short
      // cluster reports the same `arg` once per unknown letter, so `-dash/`
      // reads back as itself rather than as four inventions.
      if (key !== undefined && !unknownFlags.includes(arg)) {
        unknownFlags.push(arg);
      }
      return true;
    },
  });

  const positionals = [...(parsed._ as string[])];
  const packageInput = parsed.package ?? positionals.shift();
  const coder = parsed.coder ??
    (positionals[0] !== undefined && !isCommandName(positionals[0])
      ? positionals.shift()
      : undefined);
  const command = positionals.shift();

  return {
    package: packageInput,
    coder,
    command,
    help: parsed.help,
    version: parsed.version,
    docs: parsed.docs,
    unknownFlags,
    blankSlots: [packageInput, coder, command].flatMap((value, slot) =>
      value !== undefined && !spoken(value) ? [SLOT_WORDS[slot]] : []
    ),
    extraArgs: positionals,
  };
}

/**
 * Says what to do when the package list could not be produced.
 *
 * The list is a hint, so its absence must not be a dead end: the two lines
 * name what failed and then say, in full, how to write a package the CLI will
 * accept — which is everything the listing would have taught anyway. Offline,
 * on a locked-down `--allow-net`, or against a JSR having a bad day, level 0
 * still ends with a command that can be typed.
 *
 * @param listing The listing that came back empty
 * @returns The notes to append, or nothing when there is a list to show
 */
function listingNotes(listing: ScopeListing): string[] {
  if (listing.packages.length > 0) return [];
  return [
    `cannot list the @binstruct scope: ${listing.reason ?? "no listing"}`,
    "name a package anyway — a bare name means jsr:@binstruct/<name>, and " +
    "jsr:, npm:, https:// and ./local/mod.ts specifiers all work",
  ];
}

/**
 * Builds the level 0 guide: which package describes your bytes.
 *
 * The options are JSR's own answer to "what is in the `@binstruct` scope"
 * (`./scope.ts`, ADR 0006), so a package published after this release is
 * listed and one that never shipped is not. Names only: the descriptions the
 * listing carries are a paragraph each, and thirty of them would push the
 * `TRY` line off the screen at the one moment the user has typed nothing and
 * needs it most. A description belongs to the package that has been chosen,
 * which is level 1's job.
 *
 * @param extra Header and notes to show above the `NEXT` block
 * @param listing A listing the caller already fetched, to save a second lookup
 * @returns The guide
 */
async function packageGuide(
  extra: Pick<Guide, "header" | "notes" | "diagnostic"> = {},
  listing?: ScopeListing,
): Promise<Guide> {
  const packages = listing ?? await listScopePackages();

  return {
    ...extra,
    notes: [...(extra.notes ?? []), ...listingNotes(packages)],
    next: {
      word: "<package>",
      meaning:
        "the format your bytes are in; a bare name means jsr:@binstruct/<name>",
    },
    options: {
      heading: "PACKAGES",
      items: packages.packages.map(({ name }) => ({ name })),
      empty: "none — the listing could not be fetched",
    },
    try: [`${PROGRAM} ${SAMPLE_PACKAGE}`],
  };
}

/**
 * Builds the refusal for a command line the parser could not use as typed.
 *
 * Three mistakes end up here — a flag that does not exist, a word that says
 * nothing, a word past the third — and they share a screen because they share a
 * consequence: what the user typed is not what the CLI would act on. The answer
 * is the level 0 screen, since which word was meant to be the package is
 * exactly what is no longer known, and the footer is the `--help` recap
 * verbatim, so the calling convention shown here cannot drift from the one
 * `--help` teaches.
 *
 * @param notes What was not understood, and what it would have done
 * @param attempt A paste-ready correction, when the CLI can name one
 * @returns The guide
 */
async function unusableArgumentGuide(
  notes: readonly string[],
  attempt?: string,
): Promise<Guide> {
  const guide = await packageGuide({ diagnostic: true, notes });
  return {
    ...guide,
    try: attempt === undefined ? guide.try : [attempt],
    footer: USAGE_FOOTER,
  };
}

/**
 * Builds the guide for flags the parser does not know.
 *
 * An unrecognised flag is not a harmless extra word. `parseArgs` accepted it,
 * consumed whatever followed it as its value, and handed back a positional list
 * one word short — so `binstruct --format json png` reported on `json`, with
 * `png` never having been the package.
 *
 * @param flags The unrecognised flags, as typed
 * @returns The guide
 */
async function unknownFlagGuide(flags: readonly string[]): Promise<Guide> {
  return await unusableArgumentGuide([
    `unknown option${flags.length === 1 ? "" : "s"}: ${flags.join(", ")}`,
    "an unknown flag shifts which word is the package, so nothing was run",
  ]);
}

/**
 * Builds the guide for a slot filled with a word that says nothing.
 *
 * The same shift as an unknown flag, by a quieter route. A blank positional was
 * filtered out of the list before the slots were filled, so `binstruct "" decode`
 * put `decode` in the package slot and answered about `jsr:@binstruct/decode` —
 * an argument the user typed silently changing the meaning of the ones after it.
 * A blank word now occupies the slot it was typed into, which is the only way
 * the word after it keeps the meaning it was typed with, and is refused here by
 * the name of that slot.
 *
 * @param slots The slots that were given a blank word, e.g. `<coder>`
 * @returns The guide
 */
async function blankArgumentGuide(slots: readonly string[]): Promise<Guide> {
  return await unusableArgumentGuide([
    `${slots.join(" and ")} ${
      slots.length === 1 ? "is" : "are"
    } blank, and a blank word names nothing`,
    "a blank argument still fills its slot, so nothing was run",
  ]);
}

/**
 * Builds the guide for positionals past the third.
 *
 * There are three slots and no fourth, and a word reaching for one used to
 * vanish where it stood. The likely spelling is a forgotten redirection:
 * `binstruct arp arpData decode input.bin` waits on the terminal for the bytes
 * that are sitting in the file it discarded, and nothing on the screen says so.
 *
 * The correction is offered as a `TRY` line only when there is exactly one
 * extra word and the three slots before it are usable — that is the case where
 * the missing `<` is the whole story and the line can be written out in full.
 * With two extra words it is anyone's guess what was meant, so the notes say
 * what happened and stop.
 *
 * @param options The parsed command line, for the slots that were understood
 * @returns The guide
 */
async function extraArgumentGuide(options: CliOptions): Promise<Guide> {
  const extra = options.extraArgs;
  const { package: packageInput, coder, command } = options;
  const complete = packageInput !== undefined && spoken(packageInput) &&
    command !== undefined && isCommandName(command) &&
    (coder === undefined || spoken(coder));

  const words = [
    packageInput === undefined ? undefined : packageWord(packageInput),
    coder === undefined ? undefined : shellWord(coder),
    command,
  ].filter((word) => word !== undefined).join(" ");

  return await unusableArgumentGuide(
    [
      `unexpected argument${extra.length === 1 ? "" : "s"}: ${
        extra.map(shellWord).join(", ")
      }`,
      `${PROGRAM} takes three words at most: <package> <coder> <command>`,
      "input is read from stdin, so a file is named with a redirection",
    ],
    complete && extra.length === 1
      ? `${PROGRAM} ${words} < ${shellWord(extra[0])}`
      : undefined,
  );
}

/**
 * Pluralizes an argument count.
 *
 * @param count How many arguments
 * @returns The count and the word, agreeing in number
 */
function argumentCount(count: number): string {
  return `${count} argument${count === 1 ? "" : "s"}`;
}

/**
 * Renders the package word of a `TRY` line so that pasting it back runs.
 *
 * {@linkcode shellWord} settles what the *shell* will do with the word; this
 * settles what *this CLI* will do with it, and the two are different questions.
 * A module file may perfectly well be called `-dash.ts`, and a directory holding
 * one is what the refusal of ADR 0004 lists and offers — so the suggestion came
 * back through `parseCliArgs` as a flag cluster, set `--help` from its `h`, and
 * printed the help screen at exit 0 instead of decoding. A `TRY` line is a
 * promise that the command works when pasted, so the separator is part of the
 * line whenever the package word needs it.
 *
 * Only the package word takes one: it is the first positional, so `--` in front
 * of it covers every word after it too, and a coder or command name reached
 * through discovery cannot start with `-` — it is an identifier.
 *
 * @param word The package word, as it will be typed
 * @returns The word, shell-quoted, behind `--` when it would read as a flag
 */
function packageWord(word: string): string {
  return word.startsWith("-") ? `-- ${shellWord(word)}` : shellWord(word);
}

/**
 * Renders the first line of output: what was typed, and what it resolved to.
 *
 * Both halves are load-bearing and neither replaces the other. The short form
 * comes first because every other line of the screen — the listings, the `TRY`
 * lines — is written in it, and a header spelled differently reads as being
 * about a different package; this matters most for a path, where the resolved
 * form is an absolute `file://` URL nobody typed. The resolved form follows,
 * and only when it differs, because the shorthand of ADR 0004 has to be visible
 * to be trusted: `png` must be seen to become `jsr:@binstruct/png`.
 *
 * @param resolved The package as typed and as resolved
 * @returns The header line
 */
function specifierHeader(resolved: ResolvedSpecifier): string {
  return resolved.short === resolved.specifier
    ? `package: ${resolved.short}`
    : `package: ${resolved.short} → ${resolved.specifier}`;
}

/**
 * Puts a package's own description under the resolved-specifier line.
 *
 * ADR 0003 keeps descriptions out of the level 0 listing — thirty rows of
 * prose helps nobody choose a format — and defers them to the moment one
 * package has been picked, which is every screen this heads.
 *
 * @param header The resolved specifier line, absent when the caller announced it already
 * @param summary First line of the package's module doc, when it has one
 * @returns The header block, or `undefined` when there was no header to extend
 */
function describedHeader(
  header: string | undefined,
  summary: string | undefined,
): string | undefined {
  if (header === undefined || summary === undefined) return header;
  return `${header}\n${summary}`;
}

/**
 * Renders one discovered coder as an option row.
 *
 * @param coder The coder to describe
 * @returns Its name, decoded type and one-line summary
 */
function coderOption(coder: DiscoveredCoder) {
  const arity = `needs ${argumentCount(coder.requiredParams)}`;
  return {
    name: coder.name,
    detail: coder.decodedType === undefined
      ? undefined
      : `→ ${coder.decodedType}`,
    summary: coder.requiredParams === 0
      ? coder.summary
      : [arity, coder.summary].filter((part) => part !== undefined).join(" — "),
  };
}

/**
 * Keeps a command word a `TRY` line may carry, and drops one it may not.
 *
 * A `TRY` line is a promise that the command runs when pasted, so a word the
 * CLI would itself refuse has no business in one. The coder slot takes anything
 * that is not a reserved command name, which means the command slot can still
 * hold a non-command when the coder came from `-c`: `binstruct -c pngFile png
 * frobnicate` puts `frobnicate` there.
 *
 * @param command The command word as typed, when there was one
 * @returns The word when it names a command, otherwise nothing
 */
function carriedCommand(command: string | undefined): string | undefined {
  return command !== undefined && isCommandName(command) ? command : undefined;
}

/**
 * Joins the words of a `TRY` line, dropping the ones that are not there.
 *
 * @param words The words after the program name, absent ones included
 * @returns The command line, program name first
 */
function tryLine(...words: (string | undefined)[]): string {
  return [PROGRAM, ...words.filter((word) => word !== undefined)].join(" ");
}

/**
 * Builds the level 1 guide: which coder within a package.
 *
 * A `<command>` the user has already typed is carried into the `TRY` line.
 * Built from the missing word alone, the line was a step sideways rather than
 * one further along: `binstruct png decode` — which asks for a coder, since
 * `png` has several — answered `TRY binstruct png pngFile`, silently dropping
 * the `decode` that was already on the command line and offering a command
 * that stops one level short of the one being typed.
 *
 * @param resolved The package as typed and as resolved
 * @param header The header block, specifier and description
 * @param coders Everything discovery found
 * @param notes Lines to show above the `NEXT` block
 * @param command The command word already supplied, to keep in the `TRY` line
 * @returns The guide
 */
function coderGuide(
  resolved: ResolvedSpecifier,
  header: string | undefined,
  coders: readonly DiscoveredCoder[],
  notes?: readonly string[],
  command?: string,
): Guide {
  const callable = coders.find((coder) => coder.requiredParams === 0);
  return {
    header,
    notes,
    next: {
      word: "<coder>",
      meaning: `which structure in ${resolved.short} to work with`,
    },
    options: {
      heading: `CODERS in ${resolved.short}`,
      items: coders.map(coderOption),
      empty: "none — this package exposes no coder factories",
    },
    try: callable === undefined ? [] : [
      tryLine(
        packageWord(resolved.short),
        shellWord(callable.name),
        carriedCommand(command),
      ),
    ],
  };
}

/**
 * Builds the level 2 guide: what to do with the bytes.
 *
 * @param resolved The package as typed and as resolved
 * @param header The header block, specifier and description
 * @param coder The coder word to include in `TRY` lines, omitted when inferred
 * @param notes Lines to show above the `NEXT` block
 * @returns The guide
 */
function commandGuide(
  resolved: ResolvedSpecifier,
  header: string | undefined,
  coder: string | undefined,
  notes?: readonly string[],
): Guide {
  const words = coder === undefined
    ? packageWord(resolved.short)
    : `${packageWord(resolved.short)} ${shellWord(coder)}`;
  return {
    header,
    notes,
    next: {
      word: "<command>",
      meaning: "which direction to run the coder in",
    },
    options: {
      heading: "COMMANDS",
      items: COMMANDS.map((command) => ({ ...command })),
    },
    try: [
      `${PROGRAM} ${words} decode < input.bin > output.json5`,
      `${PROGRAM} ${words} encode < output.json5 > input.bin`,
    ],
  };
}

/**
 * Builds the guide for a package that could not be read at all.
 *
 * @param resolved The package as typed and as resolved
 * @param header The header block, absent when the caller announced the specifier already
 * @param reason What the runtime or `deno doc` said
 * @returns The guide
 */
async function unknownPackageGuide(
  resolved: ResolvedSpecifier,
  header: string | undefined,
  reason: string,
): Promise<Guide> {
  const listing = await listScopePackages();
  const suggestion = resolved.form === "bare"
    ? nearestPackage(resolved.input, listing.packages)
    : undefined;

  return await packageGuide({
    header,
    diagnostic: true,
    notes: [
      `cannot read ${resolved.specifier}: ${reason}`,
      ...(suggestion === undefined ? [] : [
        `did you mean ${suggestion.name}? — ${suggestion.description}`,
      ]),
      ...(resolved.form === "bare"
        ? [
          `a bare name always means the @binstruct scope — write ${PROGRAM} ${
            shellWord(`@hertzg/${resolved.input}`)
          } for another one, or ${
            shellWord(`./${resolved.input}/mod.ts`)
          } for a local module`,
        ]
        : []),
    ],
  }, listing);
}

/**
 * Picks the listed package a misspelled bare name was probably reaching for.
 *
 * This is where the descriptions the listing carries are spent. Level 0 shows
 * names only, but at the moment a name has failed to resolve there is exactly
 * one candidate on the screen, and one line saying what it decodes is what
 * separates `did you mean tar?` from an answer.
 *
 * A package with no description on JSR is no suggestion at all here — the
 * bare "did you mean" it would produce is already covered by the listing.
 *
 * @param typed The bare name as typed
 * @param packages The scope listing
 * @returns The nearest described package, or nothing when none is close
 */
function nearestPackage(
  typed: string,
  packages: readonly ScopePackage[],
): ScopePackage | undefined {
  const described = packages.filter(({ description }) => description !== "");
  const nearest = nearestName(typed, described.map(({ name }) => name));
  return described.find(({ name }) => name === nearest);
}

/**
 * Names a module file inside the directory that was typed.
 *
 * Written against {@linkcode ResolvedSpecifier.short}, so the suggestion is
 * spelled the way the user spelled the directory — `./pkg/mod.ts` for `./pkg`,
 * `file:///abs/pkg/mod.ts` for the URL form — and a trailing slash does not
 * turn into a double one.
 *
 * @param directory The directory as typed
 * @param name A module file name inside it
 * @returns The two joined by a single slash
 */
function moduleInside(directory: string, name: string): string {
  const trimmed = directory.endsWith("/") ? directory.slice(0, -1) : directory;
  return `${trimmed}/${name}`;
}

/** Module names a package conventionally uses as its entrypoint, best first. */
const ENTRYPOINT_NAMES: readonly string[] = [
  "mod.ts",
  "mod.tsx",
  "mod.js",
  "index.ts",
  "index.tsx",
  "index.js",
];

/** Matches a module file named as a test: `foo.test.ts`, `foo_test.ts`, `test.ts`. */
const TEST_MODULE_PATTERN = /(?:^|[._])test\.[cm]?[jt]sx?$/;

/**
 * Picks the module inside a directory that a `TRY` line should name.
 *
 * The list is alphabetical, and the first entry of a normal package is
 * `foo.test.ts`: the suggestion cost another `deno doc` and arrived nowhere,
 * with `mod.ts` sitting two rows below it. Preference runs conventional
 * entrypoint, then any module that is not a test, then whatever is first.
 *
 * Nothing here is a guess about a file that might exist — every candidate came
 * off the filesystem, so `mod.ts` is offered only when it is genuinely there,
 * which is what ADR 0004 asked for. Ordering the listing by convention is not
 * resolution; picking one for the user would be.
 *
 * @param modules Module file names inside the directory, sorted
 * @returns The module to suggest, or `undefined` when there are none
 */
function suggestedModule(modules: readonly string[]): string | undefined {
  return ENTRYPOINT_NAMES.find((name) => modules.includes(name)) ??
    modules.find((name) => !TEST_MODULE_PATTERN.test(name)) ??
    modules[0];
}

/**
 * Builds the guide for a package argument that names a directory.
 *
 * `import()` cannot load a directory at all, so — unlike every other argument —
 * there is no resolution the runtime would perform for the CLI to agree with.
 * Whatever the CLI picked would be an opinion only it holds, and one that can
 * disagree with what the user meant: `deno doc` pointed at a directory
 * documents *every* module file under it, and taking the first of those decoded
 * two bytes of input as an unrelated one-byte internal structure and exited 0.
 * So the directory is refused, and what is in it is listed the way the coder
 * level lists coders — listing is guidance, picking would be resolution.
 *
 * The `TRY` line names a module that is demonstrably there — never a name the
 * CLI hopes exists — chosen by {@linkcode suggestedModule}, which prefers a
 * conventional entrypoint and then anything that is not a test file.
 *
 * @param resolved The package as typed and as resolved
 * @param header The header block, specifier and all
 * @param modules Module file names inside the directory, sorted
 * @returns The guide, offering the modules that are actually there
 */
function directoryGuide(
  resolved: ResolvedSpecifier,
  header: string,
  modules: readonly string[],
): Guide {
  const suggestion = suggestedModule(modules);
  return {
    header,
    diagnostic: true,
    notes: [
      `${resolved.short} names a directory, and import() cannot load one`,
      "there is no directory resolution to agree with, so name the module yourself",
    ],
    next: {
      word: "<package>",
      meaning: "name the module inside the directory",
    },
    options: {
      heading: `MODULES in ${resolved.short}`,
      items: modules.map((name) => ({ name })),
      empty: "none — this directory holds no module files",
    },
    try: suggestion === undefined
      ? []
      : [`${PROGRAM} ${packageWord(moduleInside(resolved.short, suggestion))}`],
  };
}

/**
 * Builds the guide for a local package argument that points at nothing.
 *
 * Kept apart from {@linkcode directoryGuide} because the two are different
 * mistakes: a directory is a real thing named at the wrong granularity, while
 * this is a typo or a wrong working directory, and telling someone to name the
 * module inside a path that does not exist helps nobody.
 *
 * @param resolved The package as typed and as resolved
 * @param header The header block, specifier and all
 * @returns The guide
 */
async function missingPathGuide(
  resolved: ResolvedSpecifier,
  header: string,
): Promise<Guide> {
  return await packageGuide({
    header,
    diagnostic: true,
    notes: [`no such path: ${resolved.short}`],
  });
}

/**
 * Builds the guide for a local target that could not be inspected at all.
 *
 * Refusing beats assuming. The assumption available here is "it is a module",
 * which for a directory is exactly the assumption that produced confident
 * output from the wrong module.
 *
 * @param resolved The package as typed and as resolved
 * @param header The header block, specifier and all
 * @param reason What the filesystem said
 * @returns The guide
 */
async function unreadableTargetGuide(
  resolved: ResolvedSpecifier,
  header: string,
  reason: string,
): Promise<Guide> {
  return await packageGuide({
    header,
    diagnostic: true,
    notes: [`cannot inspect ${resolved.short}: ${reason}`],
  });
}

/**
 * Builds the refusal a local target calls for, if it calls for one.
 *
 * @param resolved The package as typed and as resolved
 * @param header The header block, specifier and all
 * @param target What was found at the resolved specifier
 * @returns The guide, or `undefined` when the target is something to go on with
 */
async function localTargetGuide(
  resolved: ResolvedSpecifier,
  header: string,
  target: LocalTarget,
): Promise<Guide | undefined> {
  switch (target.kind) {
    case "elsewhere":
    case "module":
      return undefined;
    case "directory":
      return directoryGuide(resolved, header, target.modules);
    case "missing":
      return await missingPathGuide(resolved, header);
    case "unreadable":
      return await unreadableTargetGuide(resolved, header, target.reason);
  }
}

/**
 * Builds the guide for a coder name the package does not export.
 *
 * @param resolved The package as typed and as resolved
 * @param header The header block, absent when the caller announced the specifier already
 * @param coders Everything discovery found
 * @param typed The name as typed
 * @param command The command word already supplied, to keep in the `TRY` line
 * @returns The guide, with the nearest match in its `TRY` line when there is one
 */
function unknownCoderGuide(
  resolved: ResolvedSpecifier,
  header: string | undefined,
  coders: readonly DiscoveredCoder[],
  typed: string,
  command?: string,
): Guide {
  const suggestion = nearestName(typed, coders.map((coder) => coder.name));
  const guide: Guide = {
    ...coderGuide(resolved, header, coders, [
      `no coder named '${typed}' in ${resolved.short}`,
      ...(suggestion === undefined ? [] : [`did you mean '${suggestion}'?`]),
    ], command),
    diagnostic: true,
  };

  return suggestion === undefined ? guide : {
    ...guide,
    try: [
      tryLine(
        packageWord(resolved.short),
        shellWord(suggestion),
        carriedCommand(command),
      ),
    ],
  };
}

/**
 * Builds the guide for a coder that exists but cannot be called.
 *
 * A factory that declares required parameters has no command-line spelling —
 * `pcapFileWith(headerCoder, recordCoder)` is the standing example — and
 * calling it with none would hand the struct `undefined` sub-coders, failing
 * somewhere inside the decode. When nothing in the package is callable either,
 * the answer is a different package rather than a different coder, so this
 * defers to {@linkcode deadEndGuide}.
 *
 * @param resolved The package as typed and as resolved
 * @param header The header block, absent when the caller announced the specifier already
 * @param coders Everything discovery found
 * @param chosen The coder that was named
 * @param command The command word already supplied, to keep in the `TRY` line
 * @returns The guide
 */
async function parameterizedCoderGuide(
  resolved: ResolvedSpecifier,
  header: string | undefined,
  coders: readonly DiscoveredCoder[],
  chosen: DiscoveredCoder,
  command?: string,
): Promise<Guide> {
  if (!coders.some((coder) => coder.requiredParams === 0)) {
    return await deadEndGuide(resolved, header, coders);
  }

  return {
    ...coderGuide(resolved, header, coders, [
      `${chosen.name} takes ${
        argumentCount(chosen.requiredParams)
      }, which the CLI cannot supply`,
    ], command),
    diagnostic: true,
  };
}

/**
 * Explains, in one line, why a `deno` subprocess produced nothing usable.
 *
 * @param failure The failed run
 * @returns A sentence naming the condition
 */
function failureNote(failure: ToolFailure): string {
  switch (failure.reason) {
    case "permission-denied":
      return "listing coders needs --allow-run=deno, and it was denied";
    case "not-spawned":
      return `deno could not be started: ${failure.stderr}`;
    case "minimum-dependency-age":
      return "this version is younger than the project's minimumDependencyAge, so the graph refused to resolve";
    case "graph-incomplete":
      return firstLine(failure.stderr) ??
        "the module graph carries an error, so it was never walked";
    case "timed-out":
      return "deno answered nothing in time and was stopped, so nothing was listed";
    case "exited-non-zero":
      return firstLine(failure.stderr) ?? `deno exited ${failure.code}`;
  }
}

/**
 * Phrases with which `deno` rejects the specifier itself.
 *
 * A non-zero exit says only that discovery did not happen. These separate the
 * cases where what was typed is at fault — where answering with the package
 * list and the implied-scope advice helps — from the ones where it is not: a
 * malformed `deno.json` in the working directory, an offline fetch, a lockfile
 * the runtime will not accept. Blaming the package name for those buries a
 * perfectly good name under thirty alternatives.
 */
const SPECIFIER_REJECTIONS: readonly string[] = [
  "not found",
  "does not exist",
  "invalid package specifier",
  "could not find version of",
];

/**
 * Reports whether a failed `deno` run blamed the specifier it was given.
 *
 * @param stderr The subprocess's stderr, colour escapes and all
 * @returns Whether the message names the specifier as the problem
 */
function blamesSpecifier(stderr: string): boolean {
  const text = stderr.toLowerCase();
  return SPECIFIER_REJECTIONS.some((phrase) => text.includes(phrase));
}

/**
 * Builds the guide for a discovery run that could not happen.
 *
 * Discovery is the one part of the CLI that needs `--allow-run=deno`, so this
 * screen always carries the escape hatch: naming the coder yourself works
 * whether or not the listing does. It is the one `TRY` line the CLI cannot
 * finish, since the missing word is the one it could not look up, so the word
 * is left as a quoted placeholder ({@linkcode metavariable}) — bare, `<coder>`
 * is an input redirection, and the promised line pasted back as a decode of a
 * file called `coder`.
 *
 * @param resolved The package as typed and as resolved
 * @param header The header block, absent when the caller announced the specifier already
 * @param failure The failed run
 * @returns The guide
 */
function toolFailureGuide(
  resolved: ResolvedSpecifier,
  header: string | undefined,
  failure: ToolFailure,
): Guide {
  return {
    header,
    diagnostic: true,
    notes: [
      `cannot list the coders in ${resolved.short}: ${failureNote(failure)}`,
      `  ${failure.command.join(" ")}`,
    ],
    next: {
      word: "<coder>",
      meaning: `which structure in ${resolved.short} to work with`,
    },
    options: {
      heading: `CODERS in ${resolved.short}`,
      items: [],
      empty: "unknown — nothing could be listed",
    },
    try: [
      `${PROGRAM} ${packageWord(resolved.short)} ${
        metavariable("coder")
      } decode < input.bin > output.json5`,
    ],
    footer: [
      `the ${metavariable("coder")} above is a placeholder: put the name there`,
      "naming the coder yourself needs no permissions; with the listing gone,",
      "one whose factory takes arguments is refused on its runtime arity rather",
      "than called with none.",
    ],
  };
}

/**
 * Builds the guide for a factory refused because its arity was unverifiable.
 *
 * The other end of the escape hatch. A named coder is accepted when discovery
 * cannot run, but accepting a *name* is not accepting a *call*: the CLI has no
 * argument to pass, so `pcapFileWith()` would build a struct over `undefined`
 * sub-coders and fail somewhere inside the decode. `Function.prototype.length`
 * is the one check left that needs no subprocess, and this is the screen it
 * produces (`./loader.ts`).
 *
 * The screen owes the user the check's limit, because the check is coarser than
 * the one it stands in for. TypeScript erases the `?` of an optional parameter,
 * so `f(x?: T)` — genuinely callable with no arguments — reports an arity of 1
 * and lands here. A parameter default (`x = v`) drops out of the count and a
 * `?` does not, which is why `@binstruct/pcap` spells its optional endianness
 * with a default (its ADR 0002). For the packages that do not, the footer names
 * the way out rather than leaving a correct invocation looking broken: grant
 * `--allow-run=deno` and the declaration settles it.
 *
 * @param resolved The package as typed and as resolved
 * @param error The refusal, carrying the factory and its runtime arity
 * @returns The guide
 */
function unverifiedArityGuide(
  resolved: ResolvedSpecifier,
  error: UnverifiedArityError,
): Guide {
  return {
    diagnostic: true,
    notes: [
      `${error.coderName} was not called: it takes ${
        argumentCount(error.arity)
      } at runtime, which the CLI cannot supply`,
      "the coder listing was unavailable, so the name was taken on trust and",
      "that arity was the only check left before the call.",
    ],
    next: {
      word: "<coder>",
      meaning:
        `which structure in ${resolved.short} to work with, taking no arguments`,
    },
    options: {
      heading: `CODERS in ${resolved.short}`,
      items: [],
      empty: "unknown — nothing could be listed",
    },
    try: [
      `${PROGRAM} ${packageWord(resolved.short)} ${
        metavariable("coder")
      } decode < input.bin > output.json5`,
    ],
    footer: [
      "a parameter written 'x?: T' counts here too: TypeScript erases the '?',",
      "so at runtime it cannot be told from a required one, and a factory that",
      "really is callable with no arguments is refused all the same.",
      `if ${error.coderName} is one of those, run again with --allow-run=deno`,
      "and the count comes from its declaration rather than from the function.",
    ],
  };
}

/**
 * Builds the guide for a package that offers nothing the CLI can call.
 *
 * Two shapes end up here: a package with no coder factories at all, where
 * `deno info` distinguishes "not a binstruct package" from "a binstruct
 * package with no type declarations", and a package whose every coder takes
 * arguments the CLI has no way to supply.
 *
 * @param resolved The package as typed and as resolved
 * @param header The header block, absent when the caller announced the specifier already
 * @param coders Everything discovery found, none of it callable
 * @returns The guide
 */
async function deadEndGuide(
  resolved: ResolvedSpecifier,
  header: string | undefined,
  coders: readonly DiscoveredCoder[],
): Promise<Guide> {
  if (coders.length > 0) {
    return await packageGuide({
      header,
      diagnostic: true,
      notes: [
        `every coder in ${resolved.short} takes arguments, which the CLI cannot supply:`,
        ...coders.map((coder) =>
          `  ${coder.name} — ${coder.requiredParams} required`
        ),
      ],
    });
  }

  const diagnosis = await diagnoseEmptyDiscovery(resolved.specifier);
  const explanation = !diagnosis.ok
    ? `its module graph could not be read: ${failureNote(diagnosis)}`
    : diagnosis.dependsOnBinstruct
    ? "it is built on @hertzg/binstruct, but ships no declaration whose type renders as Coder<…>"
    : "its module graph never reaches @hertzg/binstruct, so it is probably not a binstruct package";

  return await packageGuide({
    header,
    diagnostic: true,
    notes: [`${resolved.short} exposes no coders — ${explanation}`],
  });
}

/**
 * Settles on a discovered coder, keeping what the rest of the run wants.
 *
 * @param coder The coder discovery found
 * @param inferred Whether the user named it or the CLI worked it out
 * @param summary First line of the package's module doc, when it has one
 * @returns The successful choice
 */
function chose(
  coder: DiscoveredCoder,
  inferred: boolean,
  summary: string | undefined,
): CoderChoice {
  return {
    ok: true,
    name: coder.name,
    inferred,
    arityVerified: true,
    decodedType: coder.decodedType,
    summary,
  };
}

/**
 * Decides which coder a run will use, discovering the package's surface first.
 *
 * A named coder is validated against the listing — it must exist, and it must
 * take no required arguments, since the CLI has no way to pass any and calling
 * such a factory bare lets its argument default silently. An unnamed one is
 * inferred when the package exposes exactly one zero-argument coder (ADR 0005).
 *
 * Every invocation pays for this, complete ones included. Trusting a named
 * coder unread is what let `binstruct pcap pcapFile decode` print a whole
 * capture read at the wrong endianness with exit 0, and no cheaper check
 * distinguishes that from a correct run: a factory's runtime arity counts TypeScript's
 * optional parameters, which discovery correctly does not.
 *
 * When discovery is *unavailable* — no permission to spawn `deno`, no `deno`
 * on `PATH`, a broken config in the working directory — a named coder is still
 * accepted, so the escape hatch of ADR 0002 survives. It is accepted
 * **unverified**: the choice is marked `arityVerified: false`, and the run it
 * produces checks the factory's runtime arity before calling it
 * (`./loader.ts`). That check is coarser than this one — it cannot tell an
 * optional parameter from a required one — so it refuses a little more than
 * discovery would, in the direction that cannot emit wrong bytes. Only a
 * message blaming the specifier itself stops the run here, because then the
 * import would fail too.
 *
 * @param resolved The package as typed and as resolved
 * @param header The resolved specifier line
 * @param named The coder name as typed, when there was one
 * @param command The command word as typed, kept in the `TRY` lines that follow
 * @returns The chosen coder, or the guidance that replaces the run
 */
async function chooseCoder(
  resolved: ResolvedSpecifier,
  header: string,
  named: string | undefined,
  command: string | undefined,
): Promise<CoderChoice> {
  const discovery = await discoverCoders(resolved.specifier);

  if (!discovery.ok) {
    if (
      discovery.reason === "exited-non-zero" &&
      blamesSpecifier(discovery.stderr)
    ) {
      return {
        ok: false,
        guide: await unknownPackageGuide(
          resolved,
          header,
          failureNote(discovery),
        ),
      };
    }
    return named === undefined
      ? { ok: false, guide: toolFailureGuide(resolved, header, discovery) }
      : { ok: true, name: named, inferred: false, arityVerified: false };
  }

  const described = describedHeader(header, discovery.summary);

  if (named !== undefined) {
    const chosen = discovery.coders.find((coder) => coder.name === named);
    if (chosen === undefined) {
      return {
        ok: false,
        guide: unknownCoderGuide(
          resolved,
          described,
          discovery.coders,
          named,
          command,
        ),
      };
    }
    if (chosen.requiredParams > 0) {
      return {
        ok: false,
        guide: await parameterizedCoderGuide(
          resolved,
          described,
          discovery.coders,
          chosen,
          command,
        ),
      };
    }
    return chose(chosen, false, discovery.summary);
  }

  const callable = discovery.coders.filter((coder) =>
    coder.requiredParams === 0
  );
  if (callable.length === 1) {
    return chose(callable[0], true, discovery.summary);
  }
  if (callable.length === 0) {
    return {
      ok: false,
      guide: await deadEndGuide(resolved, described, discovery.coders),
    };
  }

  return {
    ok: false,
    guide: coderGuide(resolved, described, discovery.coders, [
      coderCountNote(resolved.short, discovery.coders.length, callable.length),
    ], command),
  };
}

/**
 * Says how many coders a package exposes, in the same terms as the block below.
 *
 * The sentence and the `CODERS` listing under it are read as one thing, so they
 * have to be counting the same thing. They were not: the line counted the
 * *callable* coders while the block rendered every discovered one, so
 * `png exposes 3 coders, so the coder word is required` sat directly above four
 * rows. The listed total leads, and the callable subset — which is the actual
 * reason the word is required — is named only when it differs.
 *
 * @param short The package as the user spelled it
 * @param listed How many coders the block shows
 * @param callable How many of those take no required arguments
 * @returns The note
 */
function coderCountNote(
  short: string,
  listed: number,
  callable: number,
): string {
  const counted = listed === callable
    ? `${short} exposes ${listed} coders`
    : `${short} exposes ${listed} coders, ${callable} of them callable`;
  return `${counted}, so the coder word is required`;
}

/**
 * Turns a guide into the plan that writes it.
 *
 * The stream and the exit code are the only difference between guidance and
 * `--help`, which is what keeps the two from drifting.
 *
 * `--help` relocates a *disclosure* level — a missing word the tool can
 * describe — to stdout with exit 0. It does not relocate a diagnostic: an
 * unreadable package is a failure whether or not help was asked for, and
 * `binstruct nosuchpkg --help > out.txt` must not put the error in the
 * redirect and then report success.
 *
 * @param guide The screen to write
 * @param help Whether it was asked for rather than provoked
 * @returns A `print` plan
 */
function present(guide: Guide, help: boolean): CliPlan {
  const asked = help && guide.diagnostic !== true;
  const text = renderGuide(
    asked
      ? { ...guide, footer: [...(guide.footer ?? []), ...USAGE_FOOTER] }
      : guide,
  );
  return asked
    ? { kind: "print", text, stream: "stdout", code: 0 }
    : { kind: "print", text, stream: "stderr", code: 1 };
}

/**
 * Renders `deno doc` for a coder and for the type it decodes to.
 *
 * The decoded type is the object shape you have to write for `encode`, which
 * is the question `--docs` exists to answer (ADR 0002), so it is fetched
 * alongside the factory. `--filter` reprints the whole module doc as a
 * preamble on every run, so the second block is shown only from the point
 * where it stops agreeing with the first. An anonymous decoded type, or one
 * that is not a documented symbol, simply yields nothing and is dropped.
 *
 * @param specifier The resolved specifier to document
 * @param choice The chosen coder and its decoded type
 * @returns Both blocks as one text, or why `deno doc` produced none
 */
async function readCoderDocs(
  specifier: string,
  choice: { readonly name: string; readonly decodedType?: string },
): Promise<SymbolDocsOutcome> {
  const coder = await readSymbolDocs(specifier, choice.name);
  if (!coder.ok || choice.decodedType === undefined) return coder;

  const decoded = await readSymbolDocs(specifier, choice.decodedType);
  if (!decoded.ok) return coder;

  const rest = withoutSharedPreamble(coder.text, decoded.text);
  return {
    ok: true,
    text: rest === "" ? coder.text : `${coder.text.trimEnd()}\n\n${rest}`,
  };
}

/**
 * Drops the leading lines a second `deno doc --filter` run repeats verbatim.
 *
 * @param first The block already shown
 * @param second The block to append
 * @returns What `second` says that `first` did not, trimmed at both ends
 */
function withoutSharedPreamble(first: string, second: string): string {
  const shown = first.split("\n");
  const lines = second.split("\n");

  let shared = 0;
  while (shared < lines.length && lines[shared] === shown[shared]) shared++;

  return lines.slice(shared).join("\n").trim();
}

/**
 * Works out what an invocation amounts to, without performing it.
 *
 * A complete invocation becomes a `run` plan; anything short of one becomes a
 * `print` plan carrying the guidance for the missing word — on stderr with
 * exit 1, or on stdout with exit 0 under `--help`. Guidance that reports a
 * failure rather than a missing word stays on stderr either way.
 *
 * An argument the parser could not use is refused before anything else is read,
 * `--help` and `--version` included: an unrecognised flag, a blank word, a word
 * past the third slot. The first two shift what the package is — the flag by
 * swallowing the next word, the blank by having been dropped — and the third
 * used to disappear without a word. Answering confidently about a package
 * nobody named, or about bytes that never arrived, is the defect class this
 * whole module is built to avoid.
 *
 * A local package argument is inspected before any of that, and a directory is
 * refused — see {@linkcode directoryGuide}. Everything downstream may therefore
 * assume the specifier names one module, which is what lets discovery and
 * `import()` be handed the same string.
 *
 * Every path validates the coder through discovery first, including a complete
 * one: see {@linkcode chooseCoder} for why the shortcut had to go.
 *
 * @param args Command line arguments
 * @returns What to do
 *
 * @example An empty command line asks for a package, listing or no listing
 * ```ts
 * import { assertEquals, assertStringIncludes } from "@std/assert";
 * import { stub } from "@std/testing/mock";
 * import { planCli } from "./cli.ts";
 *
 * using _offline = stub(
 *   globalThis,
 *   "fetch",
 *   () => Promise.reject(new TypeError("offline")),
 * );
 *
 * const plan = await planCli([]);
 *
 * assertEquals(plan.kind, "print");
 * if (plan.kind === "print") {
 *   assertEquals(plan.stream, "stderr");
 *   assertEquals(plan.code, 1);
 *   assertStringIncludes(plan.text, "NEXT  <package>");
 *   assertStringIncludes(plan.text, "TRY\n  binstruct png");
 * }
 * ```
 *
 * @example A complete invocation resolves its shorthand and runs
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { planCli } from "./cli.ts";
 *
 * const plan = await planCli(["png", "pngFile", "decode"]);
 *
 * assertEquals(plan.kind, "run");
 * if (plan.kind === "run") {
 *   assertEquals(plan.specifier, "jsr:@binstruct/png");
 *   assertEquals(plan.coder, "pngFile");
 *   assertEquals(plan.command, "decode");
 *   assertEquals(plan.notices, ["package: png → jsr:@binstruct/png"]);
 * }
 * ```
 *
 * @example A local module runs under the specifier it was named by
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { planCli } from "./cli.ts";
 *
 * const module = import.meta.resolve("../arp/mod.ts");
 * const plan = await planCli([module, "decode"]);
 *
 * assertEquals(plan.kind, "run");
 * if (plan.kind === "run") {
 *   assertEquals(plan.specifier, module);
 *   assertEquals(plan.coder, "arpData");
 * }
 * ```
 *
 * @example A directory is refused, and the modules in it are offered instead
 * ```ts
 * import { assertEquals, assertStringIncludes } from "@std/assert";
 * import { planCli } from "./cli.ts";
 *
 * const plan = await planCli([import.meta.resolve("../arp/"), "decode"]);
 *
 * assertEquals(plan.kind, "print");
 * if (plan.kind === "print") {
 *   assertEquals(plan.code, 1);
 *   assertStringIncludes(plan.text, "names a directory");
 *   assertStringIncludes(plan.text, "mod.ts");
 * }
 * ```
 *
 * @example An unknown flag is named, on stderr, and no package is guessed at
 * ```ts
 * import { assertEquals, assertStringIncludes } from "@std/assert";
 * import { planCli } from "./cli.ts";
 *
 * const plan = await planCli(["--format", "json", "png"]);
 *
 * assertEquals(plan.kind, "print");
 * if (plan.kind === "print") {
 *   assertEquals(plan.stream, "stderr");
 *   assertEquals(plan.code, 1);
 *   assertStringIncludes(plan.text, "unknown option: --format");
 *   assertEquals(plan.text.includes("jsr:@binstruct/png"), false);
 * }
 * ```
 */
export async function planCli(args: string[]): Promise<CliPlan> {
  const options = parseCliArgs(args);

  if (options.unknownFlags.length > 0) {
    return present(await unknownFlagGuide(options.unknownFlags), options.help);
  }

  if (options.blankSlots.length > 0) {
    return present(await blankArgumentGuide(options.blankSlots), options.help);
  }

  if (options.extraArgs.length > 0) {
    return present(await extraArgumentGuide(options), options.help);
  }

  if (options.version) {
    return { kind: "print", text: VERSION_LINE, stream: "stdout", code: 0 };
  }

  if (options.package === undefined) {
    return present(await packageGuide(), options.help);
  }

  const resolved = resolveSpecifier(options.package);
  const header = specifierHeader(resolved);
  const { coder, command } = options;

  const refusal = await localTargetGuide(
    resolved,
    header,
    await inspectLocalTarget(resolved.specifier),
  );
  if (refusal !== undefined) {
    return present(refusal, options.help);
  }

  const choice = await chooseCoder(resolved, header, coder, command);
  if (!choice.ok) {
    return present(choice.guide, options.help);
  }

  const described = describedHeader(header, choice.summary);
  const notices = choice.inferred
    ? [
      header,
      `using coder: ${choice.name} (only coder in ${resolved.short})`,
    ]
    : [header];

  if (options.docs) {
    const docs = await readCoderDocs(resolved.specifier, choice);
    return docs.ok
      ? {
        kind: "print",
        text: docs.text.trimEnd(),
        stream: "stdout",
        code: 0,
        notices,
      }
      : present(toolFailureGuide(resolved, described, docs), options.help);
  }

  if (!options.help && command !== undefined && isCommandName(command)) {
    return {
      kind: "run",
      specifier: resolved.specifier,
      coder: choice.name,
      command,
      arityVerified: choice.arityVerified,
      notices,
    };
  }

  const wrongCommand = command !== undefined && !isCommandName(command);

  return present(
    {
      ...commandGuide(
        resolved,
        described,
        choice.inferred ? undefined : choice.name,
        [
          ...(wrongCommand ? [`there is no command named '${command}'`] : []),
          ...(choice.inferred
            ? [
              `${choice.name} is the only coder in ${resolved.short}, so the coder word may be omitted`,
            ]
            : []),
        ],
      ),
      diagnostic: wrongCommand,
    },
    options.help,
  );
}

/**
 * Explains a failure that only surfaced once the package was imported.
 *
 * A run reaches `import()` only when discovery vouched for the coder, or when
 * discovery was unavailable and the name was taken on trust; either way the
 * package can still turn out to be unloadable, or the export can still fail to
 * behave. This runs the listing after the fact and answers with the same
 * guidance an incomplete invocation would have given, falling back to the raw
 * error when neither the package nor the coder is at fault — a malformed
 * input, say.
 *
 * An {@linkcode UnverifiedArityError} is answered without running the listing.
 * It is raised only on the trusted path, where discovery has already failed
 * once, and asking again buys nothing but a second wait — up to another thirty
 * seconds of it when the first attempt timed out.
 *
 * The guides it renders carry no header: the caller announced the specifier
 * before the run started, and repeating it makes every failure open with the
 * same line twice.
 *
 * @param packageInput The package as typed, or its resolved specifier
 * @param coderName The coder that was asked for
 * @param error What the run threw
 * @returns The text to write to stderr, without a trailing newline
 *
 * @example A misspelled coder is answered with the listing and a suggestion
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { explainFailure } from "./cli.ts";
 *
 * const text = await explainFailure(
 *   import.meta.resolve("../arp/mod.ts"),
 *   "arpDatum",
 *   new Error("Coder 'arpDatum' not found"),
 * );
 *
 * assertStringIncludes(text, "no coder named 'arpDatum'");
 * assertStringIncludes(text, "did you mean 'arpData'?");
 * ```
 */
export async function explainFailure(
  packageInput: string,
  coderName: string,
  error: unknown,
): Promise<string> {
  const resolved = resolveSpecifier(packageInput);
  const message = error instanceof Error ? error.message : String(error);

  if (error instanceof UnverifiedArityError) {
    return renderGuide(unverifiedArityGuide(resolved, error));
  }

  const discovery = await discoverCoders(resolved.specifier);
  if (!discovery.ok) {
    return discovery.reason === "exited-non-zero"
      ? renderGuide(await unknownPackageGuide(resolved, undefined, message))
      : `Error: ${message}`;
  }

  const chosen = discovery.coders.find((coder) => coder.name === coderName);
  if (chosen === undefined) {
    return renderGuide(
      unknownCoderGuide(resolved, undefined, discovery.coders, coderName),
    );
  }
  if (chosen.requiredParams > 0) {
    return renderGuide(
      await parameterizedCoderGuide(
        resolved,
        undefined,
        discovery.coders,
        chosen,
      ),
    );
  }

  return `Error: ${message}`;
}

/**
 * Main CLI entry point.
 *
 * Plans the invocation with {@linkcode planCli}, then carries it out: announces
 * the resolved specifier and any inferred coder on stderr, then either writes
 * the planned text to its stream and exits with its code, or runs the command.
 * A run that throws is explained through {@linkcode explainFailure} and exits
 * 1.
 *
 * @param args Command line arguments (defaults to `Deno.args`)
 *
 * @example Run a decode from a pipeline
 * ```ts ignore
 * import { main } from "./cli.ts";
 *
 * await main(["png", "pngFile", "decode"]);
 * ```
 */
export async function main(args: string[] = Deno.args): Promise<void> {
  const plan = await planCli(args);

  for (const notice of plan.notices ?? []) {
    console.error(notice);
  }

  if (plan.kind === "print") {
    if (plan.stream === "stdout") {
      console.log(plan.text);
    } else {
      console.error(plan.text);
    }
    if (plan.code !== 0) {
      Deno.exit(plan.code);
    }
    return;
  }

  const loading = { arityVerified: plan.arityVerified };

  try {
    if (plan.command === "decode") {
      await decodeCommand(plan.specifier, plan.coder, "jsonc", loading);
    } else {
      await encodeCommand(plan.specifier, plan.coder, "jsonc", loading);
    }
  } catch (error) {
    console.error(await explainFailure(plan.specifier, plan.coder, error));
    Deno.exit(1);
  }
}

// Run main function if this file is executed directly
if (import.meta.main) {
  await main();
}
