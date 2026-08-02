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
  type ToolFailure,
} from "./discover.ts";
import { type Guide, nearestName, renderGuide } from "./guide.ts";
import { KNOWN_PACKAGES } from "./registry.ts";
import { type ResolvedSpecifier, resolveSpecifier } from "./specifier.ts";

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
  `  a bare <package> means jsr:@binstruct/<package>; write ./${SAMPLE_PACKAGE} for a local directory`,
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
 */
type CoderChoice =
  | { readonly ok: true; readonly name: string; readonly inferred: boolean }
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
 * @param args Command line arguments
 * @returns The parsed slots and flags, with absent values left `undefined`
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
    string: ["package", "coder"],
    boolean: ["help", "version", "docs"],
    alias: { package: "p", coder: "c", help: "h", version: "v" },
  });

  const positionals = parsed._.map(String);
  const packageInput = parsed.package || positionals.shift();
  const coder = parsed.coder ||
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
function packageGuide(extra: Pick<Guide, "header" | "notes"> = {}): Guide {
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
 * Renders one discovered coder as an option row.
 *
 * @param coder The coder to describe
 * @returns Its name, decoded type and one-line summary
 */
function coderOption(coder: DiscoveredCoder) {
  const arity = `needs ${coder.requiredParams} argument${
    coder.requiredParams === 1 ? "" : "s"
  }`;
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
 * @param header The resolved specifier line
 * @param coders Everything discovery found
 * @param notes Lines to show above the `NEXT` block
 * @returns The guide
 */
function coderGuide(
  resolved: ResolvedSpecifier,
  header: string,
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
 * @param header The resolved specifier line
 * @param coder The coder word to include in `TRY` lines, omitted when inferred
 * @param notes Lines to show above the `NEXT` block
 * @returns The guide
 */
function commandGuide(
  resolved: ResolvedSpecifier,
  header: string,
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
 * @param header The resolved specifier line
 * @param reason What the runtime or `deno doc` said
 * @returns The guide
 */
function unknownPackageGuide(
  resolved: ResolvedSpecifier,
  header: string,
  reason: string,
): Guide {
  return packageGuide({
    header,
    notes: [
      `cannot read ${resolved.specifier}: ${reason}`,
      ...(resolved.form === "bare"
        ? [
          `a bare name always means the @binstruct scope — write ${PROGRAM} @hertzg/${resolved.input} for another one, or ./${resolved.input} for a directory`,
        ]
        : []),
    ],
  });
}

/**
 * Builds the guide for a coder name the package does not export.
 *
 * @param resolved The package as typed and as resolved
 * @param header The resolved specifier line
 * @param coders Everything discovery found
 * @param typed The name as typed
 * @returns The guide, with the nearest match in its `TRY` line when there is one
 */
function unknownCoderGuide(
  resolved: ResolvedSpecifier,
  header: string,
  coders: readonly DiscoveredCoder[],
  typed: string,
): Guide {
  const suggestion = nearestName(typed, coders.map((coder) => coder.name));
  const guide = coderGuide(resolved, header, coders, [
    `no coder named '${typed}' in ${resolved.short}`,
    ...(suggestion === undefined ? [] : [`did you mean '${suggestion}'?`]),
  ]);

  return suggestion === undefined
    ? guide
    : { ...guide, try: [`${PROGRAM} ${resolved.short} ${suggestion}`] };
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
    case "exited-non-zero":
      return firstLine(failure.stderr) ?? `deno exited ${failure.code}`;
  }
}

/**
 * Builds the guide for a discovery run that could not happen.
 *
 * Discovery is the one part of the CLI that needs `--allow-run=deno`, so this
 * screen always carries the escape hatch: naming the coder yourself works
 * whether or not the listing does.
 *
 * @param resolved The package as typed and as resolved
 * @param header The resolved specifier line
 * @param failure The failed run
 * @returns The guide
 */
function toolFailureGuide(
  resolved: ResolvedSpecifier,
  header: string,
  failure: ToolFailure,
): Guide {
  return {
    header,
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
 * @param header The resolved specifier line
 * @param coders Everything discovery found, none of it callable
 * @returns The guide
 */
async function deadEndGuide(
  resolved: ResolvedSpecifier,
  header: string,
  coders: readonly DiscoveredCoder[],
): Promise<Guide> {
  if (coders.length > 0) {
    return packageGuide({
      header,
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
    notes: [`${resolved.short} exposes no coders — ${explanation}`],
  });
}

/**
 * Decides which coder a run will use, discovering the package's surface first.
 *
 * A named coder is validated against the listing; an unnamed one is inferred
 * when the package exposes exactly one zero-argument coder (ADR 0005). When
 * discovery itself is unavailable a named coder is taken on trust — only the
 * inference and the validation depend on it.
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
    if (discovery.reason === "exited-non-zero") {
      return {
        ok: false,
        guide: unknownPackageGuide(resolved, header, failureNote(discovery)),
      };
    }
    return named === undefined
      ? { ok: false, guide: toolFailureGuide(resolved, header, discovery) }
      : { ok: true, name: named, inferred: false };
  }

  if (named !== undefined) {
    return discovery.coders.some((coder) => coder.name === named)
      ? { ok: true, name: named, inferred: false }
      : {
        ok: false,
        guide: unknownCoderGuide(resolved, header, discovery.coders, named),
      };
  }

  const callable = discovery.coders.filter((coder) =>
    coder.requiredParams === 0
  );
  if (callable.length === 1) {
    return { ok: true, name: callable[0].name, inferred: true };
  }
  if (callable.length === 0) {
    return {
      ok: false,
      guide: await deadEndGuide(resolved, header, discovery.coders),
    };
  }

  return {
    ok: false,
    guide: coderGuide(resolved, header, discovery.coders, [
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
 * @param guide The screen to write
 * @param help Whether it was asked for rather than provoked
 * @returns A `print` plan
 */
function present(guide: Guide, help: boolean): CliPlan {
  const text = renderGuide(
    help
      ? { ...guide, footer: [...(guide.footer ?? []), ...USAGE_FOOTER] }
      : guide,
  );
  return help
    ? { kind: "print", text, stream: "stdout", code: 0 }
    : { kind: "print", text, stream: "stderr", code: 1 };
}

/**
 * Works out what an invocation amounts to, without performing it.
 *
 * A complete invocation becomes a `run` plan and never pays for discovery.
 * Anything short of one becomes a `print` plan carrying the guidance for the
 * missing word — on stderr with exit 1, or on stdout with exit 0 under
 * `--help`.
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
 *   assertEquals(plan.notices, ["package: jsr:@binstruct/png"]);
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
  const header = `package: ${resolved.specifier}`;
  const { coder, command } = options;
  const runnable = !options.help && !options.docs && command !== undefined &&
    isCommandName(command);

  // A complete invocation is the one path that never pays for discovery.
  if (runnable && coder !== undefined) {
    return {
      kind: "run",
      specifier: resolved.specifier,
      coder,
      command,
      notices: [header],
    };
  }

  const choice = await chooseCoder(resolved, header, coder);
  if (!choice.ok) {
    return present(choice.guide, options.help);
  }

  if (options.docs) {
    const docs = await readSymbolDocs(resolved.specifier, choice.name);
    return docs.ok
      ? { kind: "print", text: docs.text.trimEnd(), stream: "stdout", code: 0 }
      : present(toolFailureGuide(resolved, header, docs), options.help);
  }

  const inference =
    `using coder: ${choice.name} (only coder in ${resolved.specifier})`;

  if (runnable) {
    return {
      kind: "run",
      specifier: resolved.specifier,
      coder: choice.name,
      command,
      notices: choice.inferred ? [header, inference] : [header],
    };
  }

  return present(
    commandGuide(
      resolved,
      header,
      choice.inferred ? undefined : choice.name,
      [
        ...(command === undefined || isCommandName(command)
          ? []
          : [`there is no command named '${command}'`]),
        ...(choice.inferred
          ? [
            `${choice.name} is the only coder in ${resolved.short}, so the coder word may be omitted`,
          ]
          : []),
      ],
    ),
    options.help,
  );
}

/**
 * Explains a failure that only surfaced once the package was imported.
 *
 * Discovery is deliberately skipped on a complete invocation, so a wrong
 * package or coder name is not caught until `import()` rejects. This runs the
 * listing after the fact and answers with the same guidance an incomplete
 * invocation would have given, falling back to the raw error when neither the
 * package nor the coder is at fault — a malformed input, say.
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
  const header = `package: ${resolved.specifier}`;
  const message = error instanceof Error ? error.message : String(error);

  const discovery = await discoverCoders(resolved.specifier);
  if (!discovery.ok) {
    return discovery.reason === "exited-non-zero"
      ? renderGuide(unknownPackageGuide(resolved, header, message))
      : `Error: ${message}`;
  }

  return discovery.coders.some((coder) => coder.name === coderName)
    ? `Error: ${message}`
    : renderGuide(
      unknownCoderGuide(resolved, header, discovery.coders, coderName),
    );
}

/**
 * Main CLI entry point.
 *
 * Plans the invocation with {@linkcode planCli}, then carries it out: writes
 * the planned text to its stream and exits with its code, or announces the
 * resolved specifier and any inferred coder on stderr and runs the command.
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

  for (const notice of plan.notices) {
    console.error(notice);
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
