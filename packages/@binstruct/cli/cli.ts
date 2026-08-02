#!/usr/bin/env -S deno run -A

/**
 * Binary Structure CLI Tool
 *
 * Decodes and encodes binary data with any binstruct package, reading stdin and
 * writing stdout so it drops into a pipeline.
 *
 * The argument list is a prefix chain, and every prefix of it is a valid
 * invocation (ADR 0001):
 *
 * ```
 * binstruct [<package> [<coder> [<command>]]] [options]
 * ```
 *
 * A prefix that stops short prints guidance for the missing word — what it
 * means, the values it may take, and a paste-ready command one step further
 * along — to **stderr**, and exits **1**. `--help` prints the same material to
 * **stdout** and exits **0**. Stdout otherwise carries the payload and nothing
 * else, so a half-typed `binstruct png > out.json` leaves `out.json` empty
 * instead of filling it with a help screen.
 *
 * A bare package name means the `@binstruct` scope on JSR (ADR 0004), and a
 * package exposing exactly one zero-argument coder may omit the `<coder>` word
 * (ADR 0005).
 *
 * @example Decode a PNG file
 * ```bash
 * binstruct png pngFile decode < input.png > struct.json
 * ```
 *
 * @example The coder word is optional when a package has only one
 * ```bash
 * binstruct arp decode < arp.bin > arp.json
 * ```
 *
 * @module
 */

import { parseArgs } from "@std/cli";
import { decodeCommand } from "./commands/decode.ts";
import { encodeCommand } from "./commands/encode.ts";
import {
  diagnoseEmptyDiscovery,
  discoverCoders,
  type DiscoveredCoder,
  readSymbolDocs,
  type SymbolDocsOutcome,
  type ToolFailure,
} from "./discover.ts";
import { type Guide, nearestName, renderGuide } from "./guide.ts";
import { KNOWN_PACKAGES } from "./registry.ts";
import {
  moduleInside,
  type ResolvedSpecifier,
  resolveSpecifier,
} from "./specifier.ts";

/** How the tool is spelled in every example it prints. */
const PROGRAM = "binstruct";

/** Package used in the level 0 `TRY` line, where nothing has been typed yet. */
const SAMPLE_PACKAGE = "png";

/** Reported by `--version`. */
const VERSION_LINE = "@binstruct/cli v0.2.0";

/** The commands, which are also reserved words in the second positional. */
const COMMANDS = [
  { name: "decode", summary: "binary on stdin → JSON on stdout" },
  { name: "encode", summary: "JSON on stdin → binary on stdout" },
] as const;

/** Recap of the calling convention, appended to every `--help` screen. */
const USAGE_FOOTER: readonly string[] = [
  "USAGE",
  `  ${PROGRAM} [<package> [<coder> [<command>]]] [options]`,
  "",
  "OPTIONS",
  "  -p, --package <package>  same as the first positional",
  "  -c, --coder <coder>      same as the second positional",
  "      --docs               print `deno doc` for the chosen coder",
  "  -h, --help               print this guidance on stdout and exit 0",
  "  -v, --version            print the version",
  "",
  "NOTES",
  `  a bare <package> means jsr:@binstruct/<package>; write ./${SAMPLE_PACKAGE}/mod.ts for a local module`,
  "  without --help, guidance goes to stderr and exits 1, so a half-typed",
  "  redirect stays empty",
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
    /** Resolved module specifier to import. */
    readonly specifier: string;
    /** Coder factory to call, whether named or inferred. */
    readonly coder: string;
    /** What to do with the bytes. */
    readonly command: CommandName;
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

/**
 * Reads a flag-filled slot, treating a blank value as an unfilled one.
 *
 * @param value The flag's value, absent when the flag was not given
 * @returns The value, or `undefined` when it was absent or blank
 */
function filled(value: string | undefined): string | undefined {
  return value !== undefined && spoken(value) ? value : undefined;
}

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
 * rather than becoming the number `7` on its way to the specifier resolver. A
 * slot that is blank or nothing but whitespace is *missing*, not empty, so
 * `binstruct png "" decode` asks which coder rather than importing the package
 * to discover that the word said nothing.
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
 */
export function parseCliArgs(args: string[]): CliOptions {
  const parsed = parseArgs(args, {
    string: ["_", "package", "coder"],
    boolean: ["help", "version", "docs"],
    alias: { package: "p", coder: "c", help: "h", version: "v" },
  });

  const positionals = (parsed._ as string[]).filter(spoken);
  const packageInput = filled(parsed.package) ?? positionals.shift();
  const coder = filled(parsed.coder) ??
    (positionals[0] !== undefined && !isCommandName(positionals[0])
      ? positionals.shift()
      : undefined);

  return {
    package: packageInput,
    coder,
    command: positionals.shift(),
    help: parsed.help,
    version: parsed.version,
    docs: parsed.docs,
  };
}

/**
 * Builds the level 0 guide: which package describes your bytes.
 *
 * @param extra Header and notes to show above the `NEXT` block
 * @returns The guide
 */
function packageGuide(
  extra: Pick<Guide, "header" | "notes" | "diagnostic"> = {},
): Guide {
  return {
    ...extra,
    next: {
      word: "<package>",
      meaning:
        "the format your bytes are in; a bare name means jsr:@binstruct/<name>",
    },
    options: {
      heading: "PACKAGES",
      items: KNOWN_PACKAGES.map((name) => ({ name })),
    },
    try: [`${PROGRAM} ${SAMPLE_PACKAGE}`],
  };
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
 * Builds the level 1 guide: which coder within a package.
 *
 * @param resolved The package as typed and as resolved
 * @param header The header block, specifier and description
 * @param coders Everything discovery found
 * @param notes Lines to show above the `NEXT` block
 * @returns The guide
 */
function coderGuide(
  resolved: ResolvedSpecifier,
  header: string | undefined,
  coders: readonly DiscoveredCoder[],
  notes?: readonly string[],
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
    try: callable === undefined
      ? []
      : [`${PROGRAM} ${resolved.short} ${callable.name}`],
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
    ? resolved.short
    : `${resolved.short} ${coder}`;
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
      `${PROGRAM} ${words} decode < input.bin > output.json`,
      `${PROGRAM} ${words} encode < output.json > input.bin`,
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
function unknownPackageGuide(
  resolved: ResolvedSpecifier,
  header: string | undefined,
  reason: string,
): Guide {
  return packageGuide({
    header,
    diagnostic: true,
    notes: [
      `cannot read ${resolved.specifier}: ${reason}`,
      ...(resolved.form === "bare"
        ? [
          `a bare name always means the @binstruct scope — write ${PROGRAM} @hertzg/${resolved.input} for another one, or ./${resolved.input}/mod.ts for a local module`,
        ]
        : []),
    ],
  });
}

/**
 * Builds the guide for a path argument that names no module file.
 *
 * `deno doc ./pkg` walks into the directory and documents `./pkg/mod.ts`;
 * `import()` refuses a directory outright. Letting discovery run would
 * therefore list coders, name one, and print a `TRY` line for a command that
 * cannot start — the same split between discovery and execution that anchoring
 * a relative path to the working directory closed, only louder. Teaching the
 * CLI to find the entrypoint itself would close it the other way, at the price
 * of a filesystem probe and a second opinion about which module a directory
 * means; refusing costs one line and keeps resolution a function of the input
 * string.
 *
 * @param resolved The package as typed and as resolved
 * @param header The header block, specifier and all
 * @returns The guide, naming the module to type instead
 */
function directoryGuide(
  resolved: ResolvedSpecifier,
  header: string,
): Guide {
  const entrypoint = moduleInside(resolved.input);
  return {
    ...packageGuide({
      header,
      diagnostic: true,
      notes: [
        `cannot use ${resolved.short}: it names a directory, and a package argument has to name a module file — import() cannot load a directory, however well deno doc reads one`,
      ],
    }),
    try: [`${PROGRAM} ${entrypoint}`],
  };
}

/**
 * Builds the guide for a coder name the package does not export.
 *
 * @param resolved The package as typed and as resolved
 * @param header The header block, absent when the caller announced the specifier already
 * @param coders Everything discovery found
 * @param typed The name as typed
 * @returns The guide, with the nearest match in its `TRY` line when there is one
 */
function unknownCoderGuide(
  resolved: ResolvedSpecifier,
  header: string | undefined,
  coders: readonly DiscoveredCoder[],
  typed: string,
): Guide {
  const suggestion = nearestName(typed, coders.map((coder) => coder.name));
  const guide: Guide = {
    ...coderGuide(resolved, header, coders, [
      `no coder named '${typed}' in ${resolved.short}`,
      ...(suggestion === undefined ? [] : [`did you mean '${suggestion}'?`]),
    ]),
    diagnostic: true,
  };

  return suggestion === undefined
    ? guide
    : { ...guide, try: [`${PROGRAM} ${resolved.short} ${suggestion}`] };
}

/**
 * Builds the guide for a coder that exists but cannot be called.
 *
 * A factory that declares required parameters has no command-line spelling —
 * `pcapFile(endianness)` is the standing example — and calling it with none
 * would let the argument default silently, producing plausible bytes from the
 * wrong interpretation. When nothing in the package is callable either, the
 * answer is a different package rather than a different coder, so this defers
 * to {@linkcode deadEndGuide}.
 *
 * @param resolved The package as typed and as resolved
 * @param header The header block, absent when the caller announced the specifier already
 * @param coders Everything discovery found
 * @param chosen The coder that was named
 * @returns The guide
 */
async function parameterizedCoderGuide(
  resolved: ResolvedSpecifier,
  header: string | undefined,
  coders: readonly DiscoveredCoder[],
  chosen: DiscoveredCoder,
): Promise<Guide> {
  if (!coders.some((coder) => coder.requiredParams === 0)) {
    return await deadEndGuide(resolved, header, coders);
  }

  return {
    ...coderGuide(resolved, header, coders, [
      `${chosen.name} takes ${
        argumentCount(chosen.requiredParams)
      }, which the CLI cannot supply`,
    ]),
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
 * whether or not the listing does.
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
      `${PROGRAM} ${resolved.short} <coder> decode < input.bin > output.json`,
    ],
    footer: [
      "naming the coder yourself needs no permissions and always works;",
      "only the listing above is unavailable.",
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
    return packageGuide({
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

  return packageGuide({
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
 * taken on trust, so the escape hatch of ADR 0002 survives. Only a message
 * blaming the specifier itself stops the run, because then the import would
 * fail too.
 *
 * @param resolved The package as typed and as resolved
 * @param header The resolved specifier line
 * @param named The coder name as typed, when there was one
 * @returns The chosen coder, or the guidance that replaces the run
 */
async function chooseCoder(
  resolved: ResolvedSpecifier,
  header: string,
  named: string | undefined,
): Promise<CoderChoice> {
  const discovery = await discoverCoders(resolved.specifier);

  if (!discovery.ok) {
    if (
      discovery.reason === "exited-non-zero" &&
      blamesSpecifier(discovery.stderr)
    ) {
      return {
        ok: false,
        guide: unknownPackageGuide(resolved, header, failureNote(discovery)),
      };
    }
    return named === undefined
      ? { ok: false, guide: toolFailureGuide(resolved, header, discovery) }
      : { ok: true, name: named, inferred: false };
  }

  const described = describedHeader(header, discovery.summary);

  if (named !== undefined) {
    const chosen = discovery.coders.find((coder) => coder.name === named);
    if (chosen === undefined) {
      return {
        ok: false,
        guide: unknownCoderGuide(resolved, described, discovery.coders, named),
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
      `${resolved.short} exposes ${callable.length} coders, so the coder word is required`,
    ]),
  };
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
 * Every path validates the coder through discovery first, including a complete
 * one: see {@linkcode chooseCoder} for why the shortcut had to go.
 *
 * @param args Command line arguments
 * @returns What to do
 *
 * @example An empty command line asks for a package, on stderr, with exit 1
 * ```ts
 * import { assertEquals, assertStringIncludes } from "@std/assert";
 * import { planCli } from "./cli.ts";
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
 * @example A directory is refused rather than listed and then failed on
 * ```ts
 * import { assertEquals, assertStringIncludes } from "@std/assert";
 * import { planCli } from "./cli.ts";
 *
 * const plan = await planCli(["./mypkg", "decode"]);
 *
 * assertEquals(plan.kind, "print");
 * if (plan.kind === "print") {
 *   assertEquals(plan.code, 1);
 *   assertStringIncludes(plan.text, "it names a directory");
 *   assertStringIncludes(plan.text, "TRY\n  binstruct ./mypkg/mod.ts");
 * }
 * ```
 */
export async function planCli(args: string[]): Promise<CliPlan> {
  const options = parseCliArgs(args);

  if (options.version) {
    return { kind: "print", text: VERSION_LINE, stream: "stdout", code: 0 };
  }

  if (options.package === undefined) {
    return present(packageGuide(), options.help);
  }

  const resolved = resolveSpecifier(options.package);
  const header = specifierHeader(resolved);
  const { coder, command } = options;

  if (resolved.form === "directory") {
    return present(directoryGuide(resolved, header), options.help);
  }

  const choice = await chooseCoder(resolved, header, coder);
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

  const discovery = await discoverCoders(resolved.specifier);
  if (!discovery.ok) {
    return discovery.reason === "exited-non-zero"
      ? renderGuide(unknownPackageGuide(resolved, undefined, message))
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

  try {
    if (plan.command === "decode") {
      await decodeCommand(plan.specifier, plan.coder, "jsonc");
    } else {
      await encodeCommand(plan.specifier, plan.coder, "jsonc");
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
