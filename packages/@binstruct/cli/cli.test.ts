/**
 * Tests for the Binary Structure CLI.
 *
 * Discovery-backed cases point at packages inside this repository rather than
 * at JSR, so `deno doc` resolves them from disk and nothing here needs the
 * network. `arp` has exactly one zero-argument coder, `png` has four and every
 * one of them is callable, `pcap` has three plus `pcapFileWith` which takes
 * two, and `@hertzg/mac` is not a binstruct package at all.
 *
 * The package listing is stubbed for the whole file, and the permissions its
 * cache needs are refused, so level 0 answers from {@linkcode LISTED} without
 * reaching jsr.io or touching the cache directory of whoever runs the suite.
 */

import {
  assertEquals,
  assertNotEquals,
  assertStringIncludes,
} from "@std/assert";
import { toFileUrl } from "@std/path";
import { stub } from "@std/testing/mock";
import { FakeTime } from "@std/testing/time";
import { explainFailure, parseCliArgs, planCli } from "./cli.ts";

/**
 * The scope listing every level 0 screen in this file is built from.
 *
 * Shaped like JSR's answer, `latestVersion` included, because that field is
 * what separates a package from a claimed name: `bencode` is a real reservation
 * in the `@binstruct` scope with nothing published behind it, and it is here so
 * that the filtering is exercised rather than assumed.
 */
const LISTED = [
  {
    scope: "binstruct",
    name: "arp",
    description: "ARP packets, RFC 826.",
    latestVersion: "0.3.0",
  },
  {
    scope: "binstruct",
    name: "bencode",
    description: "Bencode, as BitTorrent uses it.",
    latestVersion: null,
  },
  {
    scope: "binstruct",
    name: "cli",
    description: "This tool.",
    latestVersion: "0.2.0",
  },
  {
    scope: "binstruct",
    name: "png",
    description: "PNG image file format.",
    latestVersion: "0.4.0",
  },
  {
    scope: "binstruct",
    name: "tar",
    description: "POSIX ustar archives.",
    latestVersion: "0.1.0",
  },
  {
    scope: "binstruct",
    name: "tls-record",
    description: "TLS record layer, RFC 8446.",
    latestVersion: "0.1.0",
  },
];

/** What the stubbed `fetch` answers with. */
let answer: () => Promise<Response> = () =>
  Promise.resolve(Response.json({ items: LISTED }));

stub(globalThis, "fetch", () => answer());

/**
 * Swaps the answer the stubbed `fetch` gives, for the duration of a block.
 *
 * `fetch` is stubbed once for the file — a second stub over the same property
 * is refused — so the failure paths are reached by changing what the one stub
 * says rather than by replacing it.
 *
 * @param next The answer to give while the returned value is alive
 * @returns A disposable that puts the previous answer back
 */
function answering(next: () => Promise<Response>): Disposable {
  const previous = answer;
  answer = next;
  return { [Symbol.dispose]: () => void (answer = previous) };
}

stub(
  Deno.permissions,
  "query",
  (descriptor: Deno.PermissionDescriptor) =>
    Promise.resolve(
      {
        state: descriptor.name === "read" || descriptor.name === "write"
          ? "denied"
          : "granted",
        onchange: null,
        partial: false,
        addEventListener() {},
        removeEventListener() {},
        dispatchEvent: () => true,
      } as unknown as Deno.PermissionStatus,
    ),
);

/** A package with exactly one zero-argument coder, `arpData`. */
const ARP = import.meta.resolve("../arp/mod.ts");

/** A package with four coders, all of them zero-argument. */
const PNG = import.meta.resolve("../png/mod.ts");

/** A package with three zero-argument coders and one that takes two. */
const PCAP = import.meta.resolve("../pcap/mod.ts");

/** A package that is not built on binstruct. */
const MAC = import.meta.resolve("../../@hertzg/mac/mod.ts");

/** This CLI, for the subprocess tests. */
const CLI = import.meta.resolve("./cli.ts");

/**
 * Everything except the network, for the subprocess cases that reach level 0.
 *
 * The package listing is the only thing the CLI fetches, and a test suite has
 * no business asking jsr.io for it. Refused, the screen these cases assert on
 * is the same one minus the `PACKAGES` names.
 */
const OFFLINE = ["-A", "--deny-net"];

/**
 * Asserts that a plan writes text, and hands back the plan for further checks.
 *
 * @param plan The plan to narrow
 * @returns The same plan, narrowed to the printing variant
 */
function printed(plan: Awaited<ReturnType<typeof planCli>>) {
  assertEquals(plan.kind, "print");
  if (plan.kind !== "print") throw new Error("unreachable");
  return plan;
}

/**
 * Runs the CLI in a subprocess, which is the only way to observe the real
 * streams and the real exit code.
 *
 * @param args Arguments after the script name
 * @param permissions Permission flags, defaulting to everything
 * @param cwd Working directory, for the path-resolution cases
 * @param input Bytes to feed stdin, for the cases that actually decode
 * @returns Exit code and decoded output
 */
async function runCli(
  args: string[],
  permissions: string[] = ["-A"],
  cwd?: string,
  input?: Uint8Array,
): Promise<{ code: number; stdout: string; stderr: string }> {
  const command = new Deno.Command(Deno.execPath(), {
    args: ["run", ...permissions, CLI, ...args],
    cwd,
    stdin: input === undefined ? "null" : "piped",
    stdout: "piped",
    stderr: "piped",
  });

  const child = command.spawn();
  if (input !== undefined) {
    const writer = child.stdin.getWriter();
    await writer.write(input);
    await writer.close();
  }

  const output = await child.output();
  const decoder = new TextDecoder();

  return {
    code: output.code,
    stdout: decoder.decode(output.stdout),
    stderr: decoder.decode(output.stderr),
  };
}

/**
 * Renders a module exporting one coder over a run of single-byte fields.
 *
 * It imports `@hertzg/binstruct` by absolute URL so the fixture needs no
 * `deno.json` of its own, which keeps the working directory free of anything
 * that could change how the CLI resolves what it is given.
 *
 * @param coder Name of the exported factory
 * @param fields Field names, one byte each, in order
 * @returns The module source
 */
function coderModule(coder: string, fields: readonly string[]): string {
  const binstruct = import.meta.resolve("../../@hertzg/binstruct/mod.ts");
  const decoded = fields.map((field) => `${field}: number`).join("; ");
  const struct = fields.map((field) => `${field}: u8()`).join(", ");

  return [
    `import { type Coder, struct, u8 } from "${binstruct}";`,
    "",
    `/** A ${fields.length}-byte structure that exists only here. */`,
    `export function ${coder}(): Coder<{ ${decoded} }> {`,
    `  return struct({ ${struct} });`,
    "}",
    "",
  ].join("\n");
}

/**
 * Writes a one-coder package into a fresh directory, as `<dir>/mypkg/<entry>`.
 *
 * @param entry Name of the entrypoint module, for the extension cases
 * @returns The containing directory, realpathed, to be removed by the caller
 */
async function writeLocalPackage(entry = "mod.ts"): Promise<string> {
  const directory = await Deno.realPath(await Deno.makeTempDir());

  await Deno.mkdir(`${directory}/mypkg`);
  await Deno.writeTextFile(
    `${directory}/mypkg/${entry}`,
    coderModule("myStruct", ["a"]),
  );

  return directory;
}

/**
 * Writes a package whose only coder declares one *optional* parameter.
 *
 * `maybe(flag?: boolean)` is callable with no arguments and reports an arity
 * of 1 all the same, because `?` is erased. It is the shape `@binstruct/pcap`
 * is being reshaped into, and the one case where the runtime check refuses
 * something the declaration would have allowed.
 *
 * @returns The containing directory, realpathed, to be removed by the caller
 */
async function writeOptionalParameterPackage(): Promise<string> {
  const directory = await Deno.realPath(await Deno.makeTempDir());
  const binstruct = import.meta.resolve("../../@hertzg/binstruct/mod.ts");

  await Deno.mkdir(`${directory}/mypkg`);
  await Deno.writeTextFile(
    `${directory}/mypkg/mod.ts`,
    [
      `import { type Coder, struct, u8 } from "${binstruct}";`,
      "",
      "/** A one-byte structure whose only parameter may be omitted. */",
      "export function maybe(_flag?: boolean): Coder<{ a: number }> {",
      "  return struct({ a: u8() });",
      "}",
      "",
    ].join("\n"),
  );

  return directory;
}

/**
 * Writes a package whose every coder declares a *required* parameter.
 *
 * No published `@binstruct/*` package is shaped this way any more — `pcap` was
 * the last one, and its factories now default their arguments — but the dead
 * end is still reachable for anyone else's package, so the case is kept alive
 * on a fixture rather than on whichever real package happens to fit today.
 *
 * @returns The containing directory, realpathed, to be removed by the caller
 */
async function writeArgumentOnlyPackage(): Promise<string> {
  const directory = await Deno.realPath(await Deno.makeTempDir());
  const binstruct = import.meta.resolve("../../@hertzg/binstruct/mod.ts");

  await Deno.mkdir(`${directory}/mypkg`);
  await Deno.writeTextFile(
    `${directory}/mypkg/mod.ts`,
    [
      `import { type Coder, struct, u8 } from "${binstruct}";`,
      "",
      "/** A one-byte structure the caller must pick a width for. */",
      "export function sized(_width: number): Coder<{ a: number }> {",
      "  return struct({ a: u8() });",
      "}",
      "",
      "/** A one-byte structure the caller must pick a byte order for. */",
      'export function ordered(_order: "le" | "be"): Coder<{ a: number }> {',
      "  return struct({ a: u8() });",
      "}",
      "",
    ].join("\n"),
  );

  return directory;
}

/**
 * Writes a package whose alphabetically first module is not the intended one.
 *
 * `mypkg/mod.ts` exports `pair`, two bytes wide; `mypkg/aaa_other.ts` exports
 * `internalOnly`, one byte wide. The two decode the same input to different
 * shapes, which is what makes a wrong choice observable rather than merely
 * arbitrary.
 *
 * @param name Directory name for the package, for the shadowing cases
 * @returns The containing directory, realpathed, to be removed by the caller
 */
async function writeAmbiguousPackage(name = "mypkg"): Promise<string> {
  const directory = await Deno.realPath(await Deno.makeTempDir());

  await Deno.mkdir(`${directory}/${name}`, { recursive: true });
  await Deno.writeTextFile(
    `${directory}/${name}/mod.ts`,
    coderModule("pair", ["a", "b"]),
  );
  await Deno.writeTextFile(
    `${directory}/${name}/aaa_other.ts`,
    coderModule("internalOnly", ["z"]),
  );

  return directory;
}

/**
 * Writes a package under a directory name that holds a space.
 *
 * `spaced dir/mod.ts` exports two coders, so levels 1 and 2 are both reachable
 * and each gets to build its own `TRY` line, and it is the conventional
 * entrypoint the directory refusal offers; `spaced dir/aaa_other.ts` sorts
 * ahead of it and is there to be passed over.
 *
 * @returns The containing directory, realpathed, to be removed by the caller
 */
async function writeSpacedPackage(): Promise<string> {
  const directory = await Deno.realPath(await Deno.makeTempDir());
  const [, ...second] = coderModule("solo", ["y"]).split("\n");

  await Deno.mkdir(`${directory}/spaced dir`);
  await Deno.writeTextFile(
    `${directory}/spaced dir/mod.ts`,
    coderModule("pair", ["a", "b"]) + second.join("\n"),
  );
  await Deno.writeTextFile(
    `${directory}/spaced dir/aaa_other.ts`,
    coderModule("internalOnly", ["z"]),
  );

  return directory;
}

Deno.test("parseCliArgs fills the three positionals in order", () => {
  assertEquals(parseCliArgs(["png", "pngFile", "decode"]), {
    package: "png",
    coder: "pngFile",
    command: "decode",
    help: false,
    version: false,
    docs: false,
    unknownFlags: [],
    blankSlots: [],
    extraArgs: [],
  });
});

Deno.test("parseCliArgs keeps -p and -c working as aliases", () => {
  const short = parseCliArgs([
    "-p",
    "jsr:@binstruct/png",
    "-c",
    "pngFile",
    "decode",
  ]);
  const long = parseCliArgs([
    "--package",
    "jsr:@binstruct/png",
    "--coder",
    "pngFile",
    "decode",
  ]);

  assertEquals(short, long);
  assertEquals(short.package, "jsr:@binstruct/png");
  assertEquals(short.coder, "pngFile");
  assertEquals(short.command, "decode");
});

Deno.test("parseCliArgs mixes flags and positionals", () => {
  const options = parseCliArgs(["-c", "pngFile", "png", "encode"]);

  assertEquals(options.package, "png");
  assertEquals(options.coder, "pngFile");
  assertEquals(options.command, "encode");
});

Deno.test("parseCliArgs leaves absent positionals undefined", () => {
  assertEquals(parseCliArgs([]), {
    package: undefined,
    coder: undefined,
    command: undefined,
    help: false,
    version: false,
    docs: false,
    unknownFlags: [],
    blankSlots: [],
    extraArgs: [],
  });

  assertEquals(parseCliArgs(["png"]).coder, undefined);
  assertEquals(parseCliArgs(["png", "pngFile"]).command, undefined);
});

Deno.test("parseCliArgs reserves the command names in the coder slot", () => {
  const decode = parseCliArgs(["arp", "decode"]);

  assertEquals(decode.coder, undefined);
  assertEquals(decode.command, "decode");

  const encode = parseCliArgs(["arp", "encode"]);

  assertEquals(encode.coder, undefined);
  assertEquals(encode.command, "encode");
});

Deno.test("parseCliArgs reads the first positional as the package, always", () => {
  const options = parseCliArgs(["decode"]);

  assertEquals(options.package, "decode");
  assertEquals(options.command, undefined);
});

Deno.test("parseCliArgs ends the flags at --", () => {
  // `-dash/` is the flag cluster -d -a -s -h to any getopt-shaped parser, and
  // the `h` is `--help`: the CLI answered a decode with the whole help screen
  // on stdout, at exit 0, which is the redirect corruption ADR 0001 forbids.
  const separated = parseCliArgs(["--", "-dash/mod.ts", "decode"]);

  assertEquals(separated.package, "-dash/mod.ts");
  assertEquals(separated.coder, undefined);
  assertEquals(separated.command, "decode");
  assertEquals(separated.help, false);
  assertEquals(separated.unknownFlags, []);

  // Everything after the separator is a positional, whatever it starts with —
  // a second `--` included.
  const literal = parseCliArgs(["--", "-x", "--", "y"]);

  assertEquals(literal.package, "-x");
  assertEquals(literal.coder, "--");
  assertEquals(literal.command, "y");
  assertEquals(literal.unknownFlags, []);
});

Deno.test("parseCliArgs reports a flag it does not know", () => {
  // The damage an accepted unknown flag does is the shift: `--format` swallowed
  // `png` as its value, the package slot got `decode`, and the CLI reported
  // confidently on jsr:@binstruct/decode.
  const shifted = parseCliArgs(["--format", "png", "decode"]);

  assertEquals(shifted.unknownFlags, ["--format"]);
  assertEquals(shifted.package, "decode");

  // A cluster reports the word as typed, once, rather than four inventions.
  assertEquals(parseCliArgs(["-dash/", "decode"]).unknownFlags, ["-dash/"]);

  // Every declared flag, and every positional, is known.
  assertEquals(
    parseCliArgs(["-p", "png", "-c", "pngFile", "--docs", "-h", "-v"])
      .unknownFlags,
    [],
  );
  assertEquals(parseCliArgs(["png", "pngFile", "decode"]).unknownFlags, []);
  assertEquals(parseCliArgs(["--", "--format"]).unknownFlags, []);
  assertEquals(parseCliArgs(["--", "--format"]).package, "--format");
});

Deno.test("parseCliArgs reads the flags", () => {
  assertEquals(parseCliArgs(["-h"]).help, true);
  assertEquals(parseCliArgs(["--help"]).help, true);
  assertEquals(parseCliArgs(["-v"]).version, true);
  assertEquals(parseCliArgs(["--version"]).version, true);
  assertEquals(parseCliArgs(["png", "pngFile", "--docs"]).docs, true);
  assertEquals(
    parseCliArgs(["-p", "png", "-c", "pngFile", "-h", "decode"]).help,
    true,
  );
});

Deno.test("level 0 asks for a package, on stderr, with exit 1", async () => {
  const plan = printed(await planCli([]));

  assertEquals(plan.stream, "stderr");
  assertEquals(plan.code, 1);
  assertStringIncludes(plan.text, "NEXT  <package>");
  assertStringIncludes(plan.text, "PACKAGES");
  assertStringIncludes(plan.text, "tls-record");
  assertStringIncludes(plan.text, "TRY\n  binstruct png");
});

Deno.test("level 0 lists what JSR answers, not what shipped with the CLI", async () => {
  // A generated list is a hardcoded list: it needs a CLI release to change,
  // and its lint check compared it against the same directory scan that had
  // produced it. Whatever the listing says is what level 0 shows.
  const plan = printed(await planCli([]));

  assertStringIncludes(plan.text, "tar");
  assertStringIncludes(plan.text, "tls-record");
  assertEquals(plan.text.includes("cli"), false);
});

Deno.test("level 0 never offers a name that has nothing published", async () => {
  // JSR's scope listing carries every *claimed* name. `@binstruct/bencode` is
  // one: `latestVersion: null`, `versionCount: 0`, and
  // https://jsr.io/@binstruct/bencode/meta.json answers 404. Listed, it read
  // as a package, and `binstruct bencode` answered `cannot read
  // jsr:@binstruct/bencode: JSR package not found`.
  const plan = printed(await planCli([]));

  assertEquals(plan.text.includes("bencode"), false);
});

Deno.test("an unloadable name is not suggested as a correction of itself", async () => {
  // A name the listing offered and the runtime could not load answered
  // `cannot read jsr:@binstruct/bencode … did you mean bencode?` — the word
  // that had just been typed, matched at distance zero and handed back as a
  // spelling correction. The publication filter removes this particular
  // trigger; any listed-but-unloadable name reproduces it, so the guard is
  // tested through one.
  using _listed = answering(() =>
    Promise.resolve(Response.json({
      items: [{
        name: "definitely-not-a-package",
        description: "A name JSR knows and the runtime does not.",
        latestVersion: "1.0.0",
      }],
    }))
  );

  const plan = printed(await planCli(["definitely-not-a-package"]));

  assertStringIncludes(plan.text, "cannot read jsr:@binstruct/");
  assertEquals(plan.text.includes("did you mean"), false);
});

Deno.test("a listing that cannot be fetched is not a dead end", async () => {
  using _offline = answering(() =>
    Promise.reject(new TypeError("error sending request"))
  );

  const plan = printed(await planCli([]));

  assertEquals(plan.code, 1);
  assertStringIncludes(
    plan.text,
    "cannot list the @binstruct scope: error sending request",
  );
  assertStringIncludes(plan.text, "a bare name means jsr:@binstruct/<name>");
  assertStringIncludes(plan.text, "./local/mod.ts specifiers all work");
  assertStringIncludes(plan.text, "NEXT  <package>");
  assertStringIncludes(plan.text, "none — the listing could not be fetched");
  assertStringIncludes(plan.text, "TRY\n  binstruct png");
  assertEquals(plan.text.includes("tls-record"), false);
});

Deno.test("a listing that answers 404 degrades the same way", async () => {
  using _refused = answering(() =>
    Promise.resolve(new Response("nope", { status: 404 }))
  );

  const plan = printed(await planCli([]));

  assertStringIncludes(plan.text, "cannot list the @binstruct scope");
  assertStringIncludes(plan.text, "NEXT  <package>");
});

Deno.test("a listing with a body that is not a listing degrades too", async () => {
  using _garbage = answering(() =>
    Promise.resolve(Response.json({ message: "nope" }))
  );

  const plan = printed(await planCli([]));

  assertStringIncludes(plan.text, "cannot list the @binstruct scope");
  assertStringIncludes(plan.text, "TRY\n  binstruct png");
});

Deno.test("a misspelled bare name is matched against the live listing", async () => {
  const plan = printed(await planCli(["pnj"]));

  assertEquals(plan.code, 1);
  assertStringIncludes(plan.text, "did you mean png? — PNG image file format.");
  assertStringIncludes(
    plan.text,
    "a bare name always means the @binstruct scope",
  );
});

Deno.test("with no permissions at all the guidance still prints", async () => {
  // No --allow-net, so no listing; no --allow-read or --allow-env, so no
  // cache either. --no-prompt turns a permission the CLI forgot to check into
  // a failure rather than a hung terminal.
  const { code, stdout, stderr } = await runCli(["--help"], ["--no-prompt"]);

  assertEquals(code, 0);
  assertEquals(stderr, "");
  assertStringIncludes(stdout, "NEXT  <package>");
  assertStringIncludes(stdout, "cannot list the @binstruct scope");
  assertStringIncludes(stdout, "--allow-net=jsr.io");
  assertStringIncludes(stdout, "TRY\n  binstruct png");
});

Deno.test("--help prints the same material on stdout, with exit 0", async () => {
  const guidance = printed(await planCli([]));
  const help = printed(await planCli(["--help"]));

  assertEquals(help.stream, "stdout");
  assertEquals(help.code, 0);
  assertEquals(help.text.startsWith(guidance.text), true);
  assertStringIncludes(help.text, "USAGE");
  assertStringIncludes(help.text, "-p, --package");
});

Deno.test("--version prints on stdout with exit 0", async () => {
  const plan = printed(await planCli(["--version"]));

  assertEquals(plan.stream, "stdout");
  assertEquals(plan.code, 0);
  assertStringIncludes(plan.text, "@binstruct/cli");
});

Deno.test("level 1 lists the coders of a package with several", async () => {
  const plan = printed(await planCli([PNG]));

  assertEquals(plan.stream, "stderr");
  assertEquals(plan.code, 1);
  assertEquals(plan.text.split("\n")[0], `package: ${PNG}`);
  assertStringIncludes(plan.text, "NEXT  <coder>");
  assertStringIncludes(plan.text, "pngFile");
  assertStringIncludes(plan.text, "→ PngFile");
  assertStringIncludes(
    plan.text,
    "exposes 4 coders, so the coder word is required",
  );
});

Deno.test("level 1 names the callable subset when it is smaller", async () => {
  // The count only qualifies itself when the two differ, so a package where
  // every coder is callable — png — cannot show this sentence at all.
  const plan = printed(await planCli([PCAP]));

  assertStringIncludes(
    plan.text,
    "exposes 4 coders, 3 of them callable, so the coder word is required",
  );
  assertStringIncludes(plan.text, "needs 2 arguments");
});

Deno.test("the coder count agrees with the coders listed under it", async () => {
  // The sentence counted the callable coders while the block rendered every
  // discovered one, so `png exposes 3 coders` sat directly above four rows.
  const plan = printed(await planCli([PNG]));

  const [note] = plan.text.split("\n").filter((line) =>
    line.includes("so the coder word is required")
  );
  const counted = Number(/exposes (\d+) coders/.exec(note)?.[1]);

  const block = plan.text.split("CODERS in ")[1].split("\n\n")[0];
  const rows = block.split("\n").slice(1).filter((row) =>
    !row.startsWith("    ")
  );

  assertEquals(rows.length, counted);
});

Deno.test("level 1 collapses to level 2 when there is a lone coder", async () => {
  const plan = printed(await planCli([ARP]));

  assertEquals(plan.code, 1);
  assertStringIncludes(plan.text, "NEXT  <command>");
  assertStringIncludes(
    plan.text,
    "arpData is the only coder in " + ARP +
      ", so the coder word may be omitted",
  );
  assertStringIncludes(plan.text, `TRY\n  binstruct ${ARP} decode`);
  assertEquals(plan.text.includes(`${ARP} arpData decode`), false);
});

Deno.test("level 2 asks for a command once the coder is known", async () => {
  const plan = printed(await planCli([PNG, "pngFile"]));

  assertEquals(plan.stream, "stderr");
  assertEquals(plan.code, 1);
  assertStringIncludes(plan.text, "NEXT  <command>");
  assertStringIncludes(plan.text, "  decode  binary on stdin → JSON5");
  assertStringIncludes(plan.text, "  encode  JSON5 on stdin");
  assertStringIncludes(plan.text, `TRY\n  binstruct ${PNG} pngFile decode`);
});

Deno.test("the guidance names the format the CLI actually writes", async () => {
  // The COMMANDS block advertised JSON and every TRY line said `> output.json`,
  // while serialization.ts emits JSON5 — quoted keys, 0x literals, comments —
  // which `python3 -c 'import json; json.load(...)'` rejects.
  const plan = printed(await planCli([PNG, "pngFile"]));

  assertStringIncludes(plan.text, "JSON5 on stdout");
  assertStringIncludes(plan.text, "JSON5 on stdin");
  assertStringIncludes(plan.text, "> output.json5");
  assertStringIncludes(plan.text, "< output.json5");
  assertEquals(/[>|<] \S*\.json(?!5)/.test(plan.text), false);

  const help = printed(await planCli(["--help"]));

  assertStringIncludes(help.text, "the payload is JSON5, not JSON");
});

Deno.test("a complete invocation runs, and announces the resolved specifier", async () => {
  const plan = await planCli(["png", "pngFile", "decode"]);

  assertEquals(plan.kind, "run");
  if (plan.kind !== "run") return;

  assertEquals(plan.specifier, "jsr:@binstruct/png");
  assertEquals(plan.coder, "pngFile");
  assertEquals(plan.command, "decode");
  assertEquals(plan.notices, ["package: png → jsr:@binstruct/png"]);
});

Deno.test("the -p/-c form still reaches a run", async () => {
  const plan = await planCli(["-p", "png", "-c", "pngFile", "encode"]);

  assertEquals(plan.kind, "run");
  if (plan.kind !== "run") return;

  assertEquals(plan.command, "encode");
  assertEquals(plan.coder, "pngFile");
});

Deno.test("a lone coder is inferred, and the inference is announced", async () => {
  const plan = await planCli([ARP, "decode"]);

  assertEquals(plan.kind, "run");
  if (plan.kind !== "run") return;

  assertEquals(plan.coder, "arpData");
  assertEquals(plan.command, "decode");
  assertEquals(plan.notices, [
    `package: ${ARP}`,
    `using coder: arpData (only coder in ${ARP})`,
  ]);
});

Deno.test("two or more coders require the explicit name", async () => {
  const plan = printed(await planCli([PNG, "decode"]));

  assertEquals(plan.stream, "stderr");
  assertEquals(plan.code, 1);
  assertStringIncludes(plan.text, "NEXT  <coder>");
  assertStringIncludes(plan.text, "exposes 4 coders");
});

Deno.test("a TRY line keeps the words the user already typed", async () => {
  // `binstruct png decode` asks for the coder and answered
  // `TRY binstruct png pngChunkUnknown`, dropping the `decode` that was
  // already on the command line: a step sideways rather than one further on.
  const missingCoder = printed(await planCli([PNG, "decode"]));

  assertStringIncludes(
    missingCoder.text,
    `TRY\n  binstruct ${PNG} pngChunkUnknown decode`,
  );

  // The same on the refusals that build their own TRY line from a suggestion
  // or from the callable coders.
  const misspelled = printed(await planCli([PNG, "pngfile", "encode"]));

  assertStringIncludes(
    misspelled.text,
    `TRY\n  binstruct ${PNG} pngFile encode`,
  );

  const parameterized = printed(
    await planCli([PCAP, "pcapFileWith", "decode"]),
  );

  assertStringIncludes(
    parameterized.text,
    `TRY\n  binstruct ${PCAP} pcapGlobalHeader decode`,
  );

  // A word in the command slot that is not a command is not carried: a TRY
  // line is a promise that it runs. `-c` is what lets one get there.
  const bogus = printed(
    await planCli(["-c", "pngfile", PNG, "frobnicate"]),
  );

  assertEquals(
    bogus.text.split("TRY\n  ")[1].split("\n")[0],
    `binstruct ${PNG} pngFile`,
  );
});

Deno.test("a local path that is not there says so, and says nothing else", async () => {
  // Distinct from the directory refusal: nothing exists here, so telling
  // someone to name the module inside it would be nonsense.
  const plan = printed(await planCli(["./no-such-package.ts"]));

  assertEquals(plan.code, 1);
  assertStringIncludes(plan.text, "no such path: ./no-such-package.ts");
  assertEquals(plan.text.includes("names a directory"), false);
  assertStringIncludes(plan.text, "PACKAGES");
  assertStringIncludes(plan.text, "NEXT  <package>");
  assertEquals(plan.text.includes("["), false);
});

Deno.test("a bare name that cannot be read explains the implied scope", async () => {
  const plan = printed(await planCli(["definitely-not-a-package"]));

  assertEquals(plan.code, 1);
  assertStringIncludes(
    plan.text,
    "package: definitely-not-a-package → jsr:@binstruct/definitely-not-a-package",
  );
  assertStringIncludes(
    plan.text,
    "a bare name always means the @binstruct scope",
  );
  assertStringIncludes(plan.text, "binstruct @hertzg/definitely-not-a-package");
});

Deno.test("an unknown coder is answered with the listing and a suggestion", async () => {
  const plan = printed(await planCli([PNG, "pngfile"]));

  assertEquals(plan.code, 1);
  assertStringIncludes(plan.text, "no coder named 'pngfile'");
  assertStringIncludes(plan.text, "did you mean 'pngFile'?");
  assertStringIncludes(plan.text, "NEXT  <coder>");
  assertStringIncludes(plan.text, `TRY\n  binstruct ${PNG} pngFile`);
});

Deno.test("a package with no coders is diagnosed", async () => {
  const plan = printed(await planCli([MAC]));

  assertEquals(plan.code, 1);
  assertStringIncludes(plan.text, "exposes no coders");
  assertStringIncludes(plan.text, "never reaches @hertzg/binstruct");
  assertStringIncludes(plan.text, "NEXT  <package>");
});

Deno.test("a package whose coders all take arguments is a dead end", async () => {
  const directory = await writeArgumentOnlyPackage();
  try {
    const plan = printed(await planCli([`file://${directory}/mypkg/mod.ts`]));

    assertEquals(plan.code, 1);
    assertStringIncludes(
      plan.text,
      "takes arguments, which the CLI cannot supply",
    );
    assertStringIncludes(plan.text, "sized — 1 required");
    assertStringIncludes(plan.text, "ordered — 1 required");
    assertStringIncludes(plan.text, "NEXT  <package>");
  } finally {
    await Deno.remove(directory, { recursive: true });
  }
});

Deno.test("an unknown command is answered with the command list", async () => {
  const plan = printed(await planCli([PNG, "pngFile", "frobnicate"]));

  assertEquals(plan.code, 1);
  assertStringIncludes(plan.text, "there is no command named 'frobnicate'");
  assertStringIncludes(plan.text, "NEXT  <command>");
});

Deno.test("--docs delegates the formatting to deno doc", async () => {
  const plan = printed(await planCli([ARP, "--docs"]));

  assertEquals(plan.stream, "stdout");
  assertEquals(plan.code, 0);
  assertStringIncludes(plan.text, "arpData");
});

Deno.test("explainFailure names the nearest coder", async () => {
  const text = await explainFailure(PNG, "pngFil", new Error("not found"));

  assertStringIncludes(text, "no coder named 'pngFil'");
  assertStringIncludes(text, "did you mean 'pngFile'?");
});

Deno.test("explainFailure falls back to the raw error", async () => {
  const text = await explainFailure(ARP, "arpData", new Error("bad input"));

  assertEquals(text, "Error: bad input");
});

Deno.test("explainFailure answers an unreadable package with the package list", async () => {
  const text = await explainFailure("./no-such-package.ts", "whatever", "boom");

  assertStringIncludes(text, "cannot read file://");
  assertStringIncludes(text, "no-such-package.ts: boom");
  assertStringIncludes(text, "NEXT  <package>");
});

Deno.test("explainFailure leaves the header to its caller", async () => {
  // main() announces the specifier before the run starts, so a guide that
  // carried one too opened every post-import failure with the same line twice.
  const text = await explainFailure(PNG, "pngFil", new Error("not found"));

  assertEquals(text.includes("package: "), false);
  assertStringIncludes(text, "no coder named 'pngFil'");
});

Deno.test("explainFailure explains a coder that takes arguments", async () => {
  const text = await explainFailure(PCAP, "pcapFileWith", new Error("boom"));

  assertStringIncludes(
    text,
    "pcapFileWith takes 2 arguments, which the CLI cannot supply",
  );
  assertEquals(text.includes("Error: boom"), false);
});

Deno.test("an incomplete invocation writes nothing to stdout and exits 1", async () => {
  const bare = await runCli([], OFFLINE);

  assertEquals(bare.code, 1);
  assertEquals(bare.stdout, "");
  assertStringIncludes(bare.stderr, "NEXT  <package>");

  const halfTyped = await runCli([PNG], OFFLINE);

  assertEquals(halfTyped.code, 1);
  assertEquals(halfTyped.stdout, "");
  assertStringIncludes(halfTyped.stderr, "NEXT  <coder>");
});

Deno.test("--help writes nothing to stderr and exits 0", async () => {
  const help = await runCli(["--help"], OFFLINE);

  assertEquals(help.code, 0);
  assertEquals(help.stderr, "");
  assertStringIncludes(help.stdout, "NEXT  <package>");
  assertStringIncludes(help.stdout, "USAGE");
});

Deno.test("discovery denied still points at naming the coder directly", async () => {
  const denied = await runCli([ARP], [
    "--no-prompt",
    "--allow-read",
    "--allow-env",
  ]);

  assertEquals(denied.code, 1);
  assertEquals(denied.stdout, "");
  assertStringIncludes(denied.stderr, "cannot list the coders");
  assertStringIncludes(denied.stderr, "--allow-run=deno");
  assertStringIncludes(denied.stderr, "naming the coder yourself");
  assertNotEquals(denied.stderr.indexOf("NEXT  <coder>"), -1);
});

Deno.test("a discovery that runs out of time still points at the coder word", async () => {
  // Level 0 is bounded at three seconds; level 1 had no deadline at all, so
  // against a black-hole proxy `binstruct <package>` ran 145 seconds with a
  // blank screen and only stopped when it was killed. A timed-out subprocess
  // is now an ordinary tool failure and reaches the guidance that carries the
  // escape hatch. The clock is faked, so none of that time is spent here.
  using time = new FakeTime();

  const planning = planCli([PNG]);
  await time.tickAsync(120_000);
  const plan = printed(await planning);

  assertEquals(plan.stream, "stderr");
  assertEquals(plan.code, 1);
  assertStringIncludes(plan.text, "cannot list the coders");
  assertStringIncludes(plan.text, "answered nothing in time");
  assertStringIncludes(plan.text, "NEXT  <coder>");
  assertStringIncludes(plan.text, "naming the coder yourself needs no");
  assertStringIncludes(plan.text, "'<coder>' decode < input.bin");
});

Deno.test("a named coder outlives a discovery that ran out of time", async () => {
  // The escape hatch of ADR 0002, one level on: discovery being unavailable is
  // not a reason to refuse a name the user supplied.
  using time = new FakeTime();

  const planning = planCli([PNG, "pngFile", "decode"]);
  await time.tickAsync(120_000);
  const plan = await planning;

  assertEquals(plan.kind, "run");
  if (plan.kind !== "run") return;

  assertEquals(plan.coder, "pngFile");
});

Deno.test("a coder taking arguments is refused when the listing is unavailable", async () => {
  // The escape hatch of ADR 0002 accepts a name discovery could not check, and
  // an accepted *name* was being turned into an unchecked *call*: without
  // --allow-run=deno, `binstruct pcap pcapFileWith decode` called
  // `pcapFileWith()` with no sub-coders and wrote whatever that decoded to
  // stdout at exit 0 with nothing on stderr. `.length` is the check that
  // survives the missing permission.
  const refused = await runCli([PCAP, "pcapFileWith", "decode"], [
    "--no-prompt",
    "--allow-read",
    "--allow-env",
  ]);

  assertEquals(refused.code, 1);
  assertEquals(refused.stdout, "");
  assertStringIncludes(refused.stderr, "pcapFileWith was not called");
  assertStringIncludes(refused.stderr, "2 arguments at runtime");
  // And the screen owes the user the check's blind spot, plus the way out.
  assertStringIncludes(refused.stderr, "'x?: T'");
  assertStringIncludes(refused.stderr, "--allow-run=deno");
});

Deno.test("a zero-argument coder still runs when the listing is unavailable", async () => {
  // The other half: refusing everything unverified would close the escape
  // hatch, which is what makes a tightened permission set usable at all.
  const directory = await writeLocalPackage();
  try {
    const run = await runCli(
      ["./mypkg/mod.ts", "myStruct", "decode"],
      ["--no-prompt", "--allow-read", "--allow-env"],
      directory,
      new Uint8Array([7]),
    );

    assertEquals(run.code, 0);
    assertStringIncludes(run.stdout, "'a'");
    assertStringIncludes(run.stdout, "7");
  } finally {
    await Deno.remove(directory, { recursive: true });
  }
});

Deno.test("an optional parameter is refused unverified and runs once read", async () => {
  // The honest limit of `.length`: TypeScript erases the `?`, so a factory
  // that is genuinely callable with no arguments reports an arity of 1 and is
  // refused. `@binstruct/pcap` is being reshaped to exactly this signature, so
  // the two halves are asserted together — the refusal, and the fact that the
  // permission is what lifts it.
  const directory = await writeOptionalParameterPackage();
  try {
    const refused = await runCli(
      ["./mypkg/mod.ts", "maybe", "decode"],
      ["--no-prompt", "--allow-read", "--allow-env"],
      directory,
      new Uint8Array([7]),
    );

    assertEquals(refused.code, 1);
    assertEquals(refused.stdout, "");
    assertStringIncludes(refused.stderr, "maybe was not called");
    assertStringIncludes(
      refused.stderr,
      "if maybe is one of those, run again with --allow-run=deno",
    );

    const granted = await runCli(
      ["./mypkg/mod.ts", "maybe", "decode"],
      ["-A"],
      directory,
      new Uint8Array([7]),
    );

    assertEquals(granted.code, 0);
    assertStringIncludes(granted.stdout, "'a'");
  } finally {
    await Deno.remove(directory, { recursive: true });
  }
});

Deno.test("parseCliArgs keeps a numeric-looking word as typed", () => {
  // @std/cli coerces `_` entries, so `007` used to reach the resolver as `7`
  // and every message quoted a package the user never typed.
  assertEquals(parseCliArgs(["007"]).package, "007");
  assertEquals(parseCliArgs(["1.20", "2e3", "decode"]), {
    package: "1.20",
    coder: "2e3",
    command: "decode",
    help: false,
    version: false,
    docs: false,
    unknownFlags: [],
    blankSlots: [],
    extraArgs: [],
  });
});

Deno.test("parseCliArgs lets a blank word occupy the slot it was typed in", () => {
  // Filtering blanks out of the positional list before filling the slots is the
  // unknown-flag shift by another route: an argument the user typed silently
  // changed the meaning of the ones after it.
  const first = parseCliArgs(["", "decode"]);

  assertEquals(first.package, "");
  assertEquals(first.coder, undefined);
  assertEquals(first.command, "decode");
  assertEquals(first.blankSlots, ["<package>"]);

  const second = parseCliArgs(["png", "", "decode"]);

  assertEquals(second.package, "png");
  assertEquals(second.coder, "");
  assertEquals(second.command, "decode");
  assertEquals(second.blankSlots, ["<coder>"]);

  // Whitespace says nothing either, and the flag form takes the same route:
  // `-p ""` used to leave the package slot open for the next word to fall into.
  assertEquals(parseCliArgs(["-p", "png", "-c", "   "]).blankSlots, [
    "<coder>",
  ]);
  assertEquals(parseCliArgs(["-p", "", "decode"]).blankSlots, [
    "<package>",
    "<coder>",
  ]);
  assertEquals(parseCliArgs(["png", "pngFile", "decode"]).blankSlots, []);
});

Deno.test("parseCliArgs keeps the positionals it has no slot for", () => {
  const forgotten = parseCliArgs(["arp", "arpData", "decode", "input.bin"]);

  assertEquals(forgotten.package, "arp");
  assertEquals(forgotten.coder, "arpData");
  assertEquals(forgotten.command, "decode");
  assertEquals(forgotten.extraArgs, ["input.bin"]);

  assertEquals(parseCliArgs(["arp", "decode", "a", "b"]).extraArgs, ["a", "b"]);
  assertEquals(parseCliArgs(["png", "pngFile", "decode"]).extraArgs, []);
});

Deno.test("a blank word is refused, and never shifts the package", async () => {
  // `binstruct "" decode` read `decode` as the package and reported on
  // jsr:@binstruct/decode — a package nobody named, from an argument that was
  // dropped rather than answered.
  const plan = printed(await planCli(["", "decode"]));

  assertEquals(plan.stream, "stderr");
  assertEquals(plan.code, 1);
  assertStringIncludes(plan.text, "<package> is blank");
  assertStringIncludes(plan.text, "still fills its slot, so nothing was run");
  assertEquals(plan.text.includes("jsr:@binstruct/decode"), false);
  assertEquals(plan.text.includes("cannot read"), false);
  assertStringIncludes(plan.text, "OPTIONS");
});

Deno.test("a blank coder word is refused rather than inferred around", async () => {
  // The same shift one slot along: the blank vanished, `decode` moved into the
  // coder slot, was reserved as a command there, and the run went ahead with an
  // inferred coder — a decode nobody asked for from a word nobody typed.
  const plan = printed(await planCli([PNG, "", "decode"]));

  assertEquals(plan.code, 1);
  assertStringIncludes(plan.text, "<coder> is blank");
  assertEquals(plan.text.includes("no coder named ''"), false);

  const inferred = printed(await planCli([ARP, "", "decode"]));

  assertEquals(inferred.code, 1);
  assertStringIncludes(inferred.text, "<coder> is blank");
  assertEquals(inferred.text.includes("using coder"), false);
});

Deno.test("a blank word beats --version and --help to the answer", async () => {
  const version = printed(await planCli(["", "--version"]));

  assertEquals(version.stream, "stderr");
  assertEquals(version.code, 1);
  assertStringIncludes(version.text, "<package> is blank");

  const help = printed(await planCli(["", "--help"]));

  assertEquals(help.stream, "stderr");
  assertEquals(help.code, 1);
});

Deno.test("an extra positional is named, not discarded", async () => {
  // The forgotten `<`: the file was dropped where it stood and the CLI sat
  // reading a terminal, with nothing on the screen to say input.bin had been
  // ignored.
  const plan = printed(
    await planCli(["arp", "arpData", "decode", "input.bin"]),
  );

  assertEquals(plan.stream, "stderr");
  assertEquals(plan.code, 1);
  assertStringIncludes(plan.text, "unexpected argument: input.bin");
  assertStringIncludes(plan.text, "takes three words at most");
  assertStringIncludes(plan.text, "a file is named with a redirection");
  assertStringIncludes(
    plan.text,
    "TRY\n  binstruct arp arpData decode < input.bin",
  );
});

Deno.test("extra positionals are only guessed at when there is one", async () => {
  // Two words past the third are anyone's guess, so the screen says what
  // happened and offers no command it cannot vouch for.
  const plan = printed(await planCli(["arp", "arpData", "decode", "a", "b"]));

  assertEquals(plan.code, 1);
  assertStringIncludes(plan.text, "unexpected arguments: a, b");
  assertEquals(plan.text.includes("< a"), false);

  // Nor is one guessed at when the words before it do not make a command.
  const incomplete = printed(
    await planCli(["arp", "arpData", "frobnicate", "input.bin"]),
  );

  assertEquals(incomplete.code, 1);
  assertStringIncludes(incomplete.text, "unexpected argument: input.bin");
  assertEquals(incomplete.text.includes("< input.bin"), false);
});

Deno.test("an extra positional writes nothing to stdout", async () => {
  const run = await runCli([ARP, "arpData", "decode", "input.bin"], OFFLINE);

  assertEquals(run.code, 1);
  assertEquals(run.stdout, "");
  assertStringIncludes(run.stderr, "unexpected argument: input.bin");
});

Deno.test("level 1 shows the package's own description", async () => {
  // ADR 0003 defers descriptions from level 0 to level 1; discovery read the
  // module doc all along and the screen threw it away.
  const plan = printed(await planCli([PNG]));

  assertStringIncludes(
    plan.text,
    "PNG (Portable Network Graphics) file format",
  );
});

Deno.test("the level 2 collapse keeps the description too", async () => {
  const plan = printed(await planCli([ARP]));

  assertStringIncludes(plan.text, "NEXT  <command>");
  assertStringIncludes(plan.text, "ARP (Address Resolution Protocol) packet");
});

Deno.test("a named coder that takes arguments is refused, not called", async () => {
  // pcapFileWith(header, record) called bare would build a file coder over two
  // undefined sub-coders and fail somewhere inside the decode instead of here.
  const plan = printed(await planCli([PCAP, "pcapFileWith", "decode"]));

  assertEquals(plan.stream, "stderr");
  assertEquals(plan.code, 1);
  assertStringIncludes(
    plan.text,
    "pcapFileWith takes 2 arguments, which the CLI cannot supply",
  );
});

Deno.test("a named coder that takes arguments still lists the callable ones", async () => {
  const plan = printed(await planCli([PCAP, "pcapFileWith", "decode"]));

  assertEquals(plan.code, 1);
  assertStringIncludes(plan.text, "pcapFileWith takes 2 arguments");
  assertStringIncludes(plan.text, "NEXT  <coder>");
  assertStringIncludes(plan.text, `TRY\n  binstruct ${PCAP} pcapGlobalHeader`);
});

Deno.test("--docs announces the specifier and the inferred coder", async () => {
  const plan = printed(await planCli([ARP, "--docs"]));

  assertEquals(plan.stream, "stdout");
  assertEquals(plan.notices, [
    `package: ${ARP}`,
    `using coder: arpData (only coder in ${ARP})`,
  ]);
});

Deno.test("--docs documents the decoded type as well as the coder", async () => {
  const plan = printed(await planCli([ARP, "--docs"]));

  assertStringIncludes(plan.text, "function arpData");
  assertStringIncludes(plan.text, "interface ArpData");
  // The module doc is a `--filter` preamble on both runs; it is shown once.
  assertEquals(
    plan.text.split("An Ethernet/IPv4 ARP packet is a fixed 28 bytes").length,
    2,
  );
});

Deno.test("--docs writes plain text when stdout is not a terminal", async () => {
  const plan = printed(await planCli([ARP, "--docs"]));

  assertEquals(plan.text.includes(String.fromCharCode(27) + "["), false);
});

Deno.test("--help does not turn a diagnostic into a success", async () => {
  // Relocating guidance for a missing word is what --help is for; converting
  // an unreadable package into stdout and exit 0 is not.
  const plan = printed(await planCli(["definitely-not-a-package", "--help"]));

  assertEquals(plan.stream, "stderr");
  assertEquals(plan.code, 1);
  assertStringIncludes(plan.text, "cannot read jsr:@binstruct/");
});

Deno.test("--help does not excuse an unknown coder or a bad command", async () => {
  const coder = printed(await planCli([PNG, "pngfile", "--help"]));

  assertEquals(coder.stream, "stderr");
  assertEquals(coder.code, 1);

  const command = printed(await planCli([PNG, "pngFile", "frobnicate", "-h"]));

  assertEquals(command.stream, "stderr");
  assertEquals(command.code, 1);
});

Deno.test("--help still relocates a pure disclosure level", async () => {
  const level1 = printed(await planCli([PNG, "--help"]));

  assertEquals(level1.stream, "stdout");
  assertEquals(level1.code, 0);
  assertStringIncludes(level1.text, "NEXT  <coder>");

  const level2 = printed(await planCli([PNG, "pngFile", "--help"]));

  assertEquals(level2.stream, "stdout");
  assertEquals(level2.code, 0);
  assertStringIncludes(level2.text, "NEXT  <command>");
});

Deno.test("a run announces the specifier exactly once", async () => {
  const run = await runCli([PNG, "pngfile", "decode"]);

  assertEquals(run.code, 1);
  assertEquals(run.stderr.split(`package: ${PNG}`).length, 2);
});

Deno.test("a relative package is read from the working directory", async () => {
  // Discovery resolved a relative specifier against the cwd while import()
  // resolved it against cli.ts, so a local module was listed from one place
  // and loaded — or not — from another.
  const directory = await Deno.makeTempDir();
  try {
    const binstruct = import.meta.resolve("../../@hertzg/binstruct/mod.ts");
    await Deno.writeTextFile(
      `${directory}/local.ts`,
      [
        `import { type Coder, struct, u8 } from "${binstruct}";`,
        "",
        "/** A one-byte structure that exists only in this directory. */",
        "export function localOnly(): Coder<{ a: number }> {",
        "  return struct({ a: u8() });",
        "}",
        "",
      ].join("\n"),
    );

    const listed = await runCli(["./local.ts"], ["-A"], directory);

    assertEquals(listed.code, 1);
    assertStringIncludes(listed.stderr, "localOnly");
    assertStringIncludes(listed.stderr, `package: ./local.ts → file://`);
    assertEquals(listed.stderr.includes("@binstruct/cli/local.ts"), false);
  } finally {
    await Deno.remove(directory, { recursive: true });
  }
});

Deno.test("a directory is refused, and its modules are offered instead", async () => {
  // `deno doc ./mypkg` documents every module file under it — one node each,
  // no entrypoint among them — and the CLI read the first, so ./mypkg decoded
  // through aaa_other.ts: the alphabetical accident, not the package. import()
  // has no directory resolution to agree with, so nothing here picks one.
  const directory = await writeAmbiguousPackage();
  try {
    const plan = printed(await planCli([`${directory}/mypkg`, "decode"]));

    assertEquals(plan.stream, "stderr");
    assertEquals(plan.code, 1);
    assertStringIncludes(plan.text, "names a directory");
    assertStringIncludes(plan.text, "import() cannot load one");
    assertStringIncludes(plan.text, "MODULES in ");
    assertStringIncludes(plan.text, "aaa_other.ts");
    assertStringIncludes(plan.text, "mod.ts");
    assertEquals(plan.text.includes("internalOnly"), false);
    assertEquals(plan.text.includes("using coder"), false);
  } finally {
    await Deno.remove(directory, { recursive: true });
  }
});

Deno.test("a directory never decodes to the wrong shape", async () => {
  // Two bytes in, `{ 'z': 1 }` out, exit 0 — a one-byte internal structure
  // decoded from input meant for a two-byte one, reported as a success.
  const directory = await writeAmbiguousPackage();
  try {
    const run = await runCli(
      ["./mypkg", "decode"],
      ["-A"],
      directory,
      new Uint8Array([1, 2]),
    );

    assertEquals(run.code, 1);
    assertEquals(run.stdout, "");
    assertEquals(run.stderr.includes("'z'"), false);
    assertEquals(run.stderr.includes("using coder: internalOnly"), false);
    assertStringIncludes(run.stderr, "names a directory");
  } finally {
    await Deno.remove(directory, { recursive: true });
  }
});

Deno.test("the module named directly decodes, end to end", async () => {
  // The other half of the refusal: naming the module works, and works with the
  // structure the module actually declares.
  const directory = await writeAmbiguousPackage();
  try {
    const run = await runCli(
      ["./mypkg/mod.ts", "decode"],
      ["-A"],
      directory,
      new Uint8Array([1, 2]),
    );

    assertEquals(run.code, 0);
    assertStringIncludes(run.stdout, "'a'");
    assertStringIncludes(run.stdout, "'b'");
    assertEquals(run.stdout.includes("'z'"), false);
    assertStringIncludes(run.stderr, "using coder: pair");
  } finally {
    await Deno.remove(directory, { recursive: true });
  }
});

Deno.test("the standard deno.json + mod.ts layout is refused, not called empty", async () => {
  // This layout used to die inside the empty-discovery diagnosis, reported as
  // "exposes no coders — its module graph could not be read:
  // [ERR_UNSUPPORTED_DIR_IMPORT] …", which blames the package for the CLI
  // having pointed a directory at import().
  const directory = await writeLocalPackage();
  try {
    await Deno.writeTextFile(
      `${directory}/mypkg/deno.json`,
      '{ "name": "@x/mypkg", "version": "0.0.1", "exports": "./mod.ts" }\n',
    );

    const plan = printed(await planCli([`${directory}/mypkg`, "decode"]));

    assertEquals(plan.code, 1);
    assertStringIncludes(plan.text, "names a directory");
    assertEquals(plan.text.includes("exposes no coders"), false);
    assertEquals(plan.text.includes("ERR_UNSUPPORTED_DIR_IMPORT"), false);
    // The listing offers modules, not everything in the directory: `deno.json`
    // is not something the package argument may name, and the `exports` map in
    // it is not consulted — reading it would be resolving.
    assertStringIncludes(plan.text, "mod.ts");
    assertEquals(plan.text.includes("deno.json"), false);
    assertStringIncludes(
      plan.text,
      `TRY\n  binstruct ${directory}/mypkg/mod.ts`,
    );
  } finally {
    await Deno.remove(directory, { recursive: true });
  }
});

Deno.test("a directory is refused however it is spelled", async () => {
  // The header prints `→ file:///…` for every local path and `--docs` prints
  // `Defined in file:///…`, so the URL spelling is one the CLI itself teaches;
  // a trailing slash and a symlink are the same directory again. The decision
  // is taken on the resolved target, so all of them reach it.
  const directory = await writeAmbiguousPackage();
  try {
    await Deno.symlink(`${directory}/mypkg`, `${directory}/link`);

    const spellings = [
      `${directory}/mypkg`,
      `${directory}/mypkg/`,
      toFileUrl(`${directory}/mypkg`).href,
      `${toFileUrl(`${directory}/mypkg`).href}/`,
      `${directory}/link`,
    ];

    for (const spelling of spellings) {
      const plan = printed(await planCli([spelling, "decode"]));

      assertEquals(plan.code, 1);
      assertStringIncludes(plan.text, "names a directory");
      assertStringIncludes(plan.text, "aaa_other.ts");
      // Never a TRY line pointing at a path that cannot exist.
      assertEquals(plan.text.includes("//aaa_other.ts"), false);
      assertStringIncludes(plan.text, "TRY\n  binstruct ");
    }
  } finally {
    await Deno.remove(directory, { recursive: true });
  }
});

Deno.test("a trailing slash is a directory, not a registry name", async () => {
  // `arp/` is what shell tab-completion types for a directory, and it starts
  // with neither `.` nor `/` and ends in no module extension — so the old
  // classifier called it a bare name, expanded it to `jsr:@binstruct/arp/` and
  // decoded stdin against the *published* @binstruct/arp while a local `arp/`
  // sat in the working directory. Exit 0, 543 bytes of confident output from a
  // package nobody named. The fixture is deliberately called `arp` so that a
  // regression reaches the registry rather than a name that does not exist.
  const directory = await writeAmbiguousPackage("arp");
  try {
    const run = await runCli(
      ["arp/", "decode"],
      ["-A"],
      directory,
      new Uint8Array([1, 2]),
    );

    assertEquals(run.code, 1);
    assertEquals(run.stdout, "");
    assertStringIncludes(run.stderr, "names a directory");
    // Neither the registry nor either module was consulted.
    assertEquals(run.stderr.includes("jsr:"), false);
    assertEquals(run.stderr.includes("using coder"), false);
    assertEquals(run.stderr.includes("hardwareType"), false);
  } finally {
    await Deno.remove(directory, { recursive: true });
  }
});

Deno.test("a nested path is a path, not a scope and a package", async () => {
  // Same leak, second spelling: `nested/inner` became `jsr:@binstruct/nested/inner`.
  const directory = await writeAmbiguousPackage("nested/inner");
  try {
    const plan = printed(await planCli(["nested/inner", "decode"]));

    assertEquals(plan.code, 1);
    assertEquals(plan.text.includes("jsr:@binstruct/nested"), false);

    const run = await runCli(
      ["nested/inner", "decode"],
      ["-A"],
      directory,
      new Uint8Array([1, 2]),
    );

    assertEquals(run.code, 1);
    assertEquals(run.stdout, "");
    assertStringIncludes(run.stderr, "names a directory");
  } finally {
    await Deno.remove(directory, { recursive: true });
  }
});

Deno.test("every spelling of one directory reaches one decision", async () => {
  // What `target.ts` and ADR 0004 claim, checked rather than assumed: the
  // relative form, the trailing slash, the absolute path, the `file:` URL and
  // a symlink to any of them are one thing and answer one way. Resolution
  // supplies half of that — it classifies all of them as a path or a `file:`
  // URL and normalizes the slash away — and the stat here supplies the rest.
  // `pkg/` used to reach neither half.
  const directory = await writeAmbiguousPackage();
  try {
    await Deno.symlink(`${directory}/mypkg`, `${directory}/link`);
    const url = toFileUrl(`${directory}/mypkg`).href;

    const spellings = [
      "./mypkg",
      "./mypkg/",
      "mypkg/",
      `${directory}/mypkg`,
      `${directory}/mypkg/`,
      url,
      `${url}/`,
      "./link",
      "link/",
    ];

    for (const spelling of spellings) {
      const run = await runCli(
        [spelling, "decode"],
        ["-A"],
        directory,
        new Uint8Array([1, 2]),
      );

      assertEquals(run.code, 1, `${spelling} is refused`);
      assertEquals(run.stdout, "", `${spelling} writes no payload`);
      assertStringIncludes(run.stderr, "names a directory");
    }
  } finally {
    await Deno.remove(directory, { recursive: true });
  }
});

Deno.test("a TRY line pastes back as one argument", async (t) => {
  // A `TRY` line is a promise that the command works when pasted. Spaces are
  // ordinary in a path, and `binstruct "./spaced dir"` answered
  // `TRY binstruct ./spaced dir/aaa_other.ts`, which pastes as two arguments
  // and dies on `no such path: ./spaced`. Every level that prints one is
  // checked, since each builds its own.
  const directory = await writeSpacedPackage();
  const pkg = `${directory}/spaced dir`;
  try {
    await t.step("the directory refusal", async () => {
      const plan = printed(await planCli([pkg, "decode"]));

      assertStringIncludes(
        plan.text,
        `TRY\n  binstruct '${pkg}/mod.ts'`,
      );
    });

    await t.step("the `file:` spelling the header teaches", async () => {
      const plan = printed(await planCli([`file://${pkg}`, "decode"]));

      assertStringIncludes(
        plan.text,
        `TRY\n  binstruct 'file://${pkg}/mod.ts'`,
      );
    });

    await t.step("level 1, where the coder comes from discovery", async () => {
      const plan = printed(await planCli([`${pkg}/mod.ts`]));

      assertStringIncludes(plan.text, `TRY\n  binstruct '${pkg}/mod.ts' pair`);
    });

    await t.step("level 2, where the redirections must stay bare", async () => {
      const plan = printed(await planCli([`${pkg}/mod.ts`, "pair"]));

      assertStringIncludes(
        plan.text,
        `TRY\n  binstruct '${pkg}/mod.ts' pair decode < input.bin > output.json5`,
      );
    });
  } finally {
    await Deno.remove(directory, { recursive: true });
  }
});

/**
 * Reads the `TRY` block of a rendered screen.
 *
 * @param text The rendered guidance
 * @returns One entry per suggested command line, without its indent
 */
function tryLines(text: string): string[] {
  const block = text.split("\nTRY\n")[1];
  if (block === undefined) return [];

  return block.split("\n\n")[0].split("\n").map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/**
 * Reports the words of a `TRY` line a shell would not hand on as typed.
 *
 * The redirection operators are the only shell syntax a `TRY` line is allowed
 * to carry, and they stand alone as `<` and `>`. Anything longer holding a
 * shell metacharacter unquoted is a word the shell will act on instead of
 * passing along — which is what `<coder>` was.
 *
 * @param line One suggested command line
 * @returns The words that would not survive the paste
 */
function shellHazards(line: string): string[] {
  return line.split(" ").filter((word) =>
    word.length > 1 && !word.startsWith("'") && /[<>|&;$`()*?]/.test(word)
  );
}

Deno.test("no TRY line carries shell syntax outside a redirection", async () => {
  // `toolFailureGuide` put a bare `<coder>` in its TRY line, exempted from
  // `shellWord` as if it were prose. To a shell it is an input redirection, so
  // the promised command pasted back as a decode of a file called `coder`.
  // Every screen that prints a TRY line is checked, not just that one.
  const directory = await writeSpacedPackage();
  try {
    const plans = [
      await planCli([]),
      await planCli([PNG]),
      await planCli([PNG, "pngFile"]),
      await planCli([PNG, "pngfile"]),
      await planCli([PCAP, "pcapFileWith", "decode"]),
      await planCli([`${directory}/spaced dir`, "decode"]),
      await planCli(["arp", "arpData", "decode", "input.bin"]),
    ];

    // The guide that carried the metavariable is only reachable with discovery
    // unavailable, which takes a subprocess, so it joins the scan from there.
    const denied = await runCli([ARP], [
      "--no-prompt",
      "--allow-read",
      "--allow-env",
    ]);

    assertStringIncludes(denied.stderr, "cannot list the coders");

    const lines = [
      ...plans.flatMap((plan) =>
        plan.kind === "print" ? tryLines(plan.text) : []
      ),
      ...tryLines(denied.stderr),
    ];

    assertNotEquals(lines.length, 0);
    for (const line of lines) {
      assertEquals(shellHazards(line), [], line);
    }
  } finally {
    await Deno.remove(directory, { recursive: true });
  }
});

Deno.test("the escape-hatch TRY line pastes back as a placeholder", async () => {
  // The one TRY line the CLI cannot finish, since the missing word is the one
  // it could not look up. Bare, `<coder>` is an input redirection: the line
  // pasted back as `binstruct ./mypkg/mod.ts decode`, reading a file called
  // `coder` — a different command, and one that could exit 0.
  const directory = await writeLocalPackage();
  try {
    await Deno.writeTextFile(`${directory}/coder`, "not a coder\n");
    await Deno.writeFile(`${directory}/input.bin`, new Uint8Array([7]));

    const denied = await runCli(
      ["./mypkg/mod.ts"],
      ["--no-prompt", "--allow-read", "--allow-env"],
      directory,
    );

    assertEquals(denied.code, 1);
    assertStringIncludes(denied.stderr, "cannot list the coders");

    const suggestion = denied.stderr
      .split("TRY\n  binstruct ")[1]
      .split("\n")[0];

    assertEquals(
      suggestion,
      `./mypkg/mod.ts '<coder>' decode < input.bin > output.json5`,
    );

    const shell = new Deno.Command("sh", {
      args: ["-c", `"$0" run -A "$1" ${suggestion}`, Deno.execPath(), CLI],
      cwd: directory,
      stdout: "piped",
      stderr: "piped",
    });
    const output = await shell.output();

    // The placeholder reaches the CLI as a word and is refused by name, rather
    // than being eaten by the shell and decoding whatever `coder` held.
    assertNotEquals(output.code, 0);
    assertStringIncludes(
      new TextDecoder().decode(output.stderr),
      "no coder named '<coder>'",
    );
    assertEquals(await Deno.readTextFile(`${directory}/output.json5`), "");
  } finally {
    await Deno.remove(directory, { recursive: true });
  }
});

Deno.test("a quoted TRY line survives a real shell", async () => {
  // The point of the quoting, end to end: the suggestion is pasted back into a
  // shell, word-split by it, and still has to decode.
  const directory = await writeSpacedPackage();
  try {
    const refusal = printed(
      await planCli([`${directory}/spaced dir`, "decode"]),
    );
    const suggestion =
      refusal.text.split("TRY\n  binstruct ")[1].split("\n")[0];

    const shell = new Deno.Command("sh", {
      args: [
        "-c",
        // `mod.ts` here exports two coders, so the run names one; the point
        // under test is that the quoted path survives the shell's word
        // splitting, which the following words do not change.
        `printf '\\1\\2' | "$0" run -A "$1" ${suggestion} pair decode`,
        Deno.execPath(),
        CLI,
      ],
      cwd: directory,
      stdout: "piped",
      stderr: "piped",
    });
    const output = await shell.output();

    assertEquals(output.code, 0);
    assertStringIncludes(new TextDecoder().decode(output.stdout), "'a'");
  } finally {
    await Deno.remove(directory, { recursive: true });
  }
});

Deno.test("a symlink the refusal offers is one that loads", async () => {
  // `Deno.readDir` does not follow links, so a dangling `aaa_link.ts` was
  // listed as a module and — sorting first — became the `TRY` line, which then
  // failed with `no such path`. A `*.ts` link to a directory landed back on
  // the directory refusal. The refusal's only suggestion must work, whichever
  // module it lands on.
  const directory = await writeAmbiguousPackage();
  try {
    await Deno.symlink(
      `${directory}/mypkg/nowhere.ts`,
      `${directory}/mypkg/aaa_dead.ts`,
    );
    await Deno.symlink(`${directory}/mypkg`, `${directory}/mypkg/aaa_dir.ts`);

    const plan = printed(await planCli([`${directory}/mypkg`, "decode"]));

    assertEquals(plan.text.includes("aaa_dead.ts"), false);
    assertEquals(plan.text.includes("aaa_dir.ts"), false);
    assertStringIncludes(
      plan.text,
      `TRY\n  binstruct ${directory}/mypkg/mod.ts`,
    );

    // And the suggestion loads, rather than bouncing off another refusal.
    const run = await runCli(
      ["./mypkg/mod.ts", "decode"],
      ["-A"],
      directory,
      new Uint8Array([1, 2]),
    );

    assertEquals(run.code, 0);
    assertStringIncludes(run.stdout, "'a'");
  } finally {
    await Deno.remove(directory, { recursive: true });
  }
});

Deno.test("the directory refusal offers an entrypoint, not a test file", async () => {
  // The listing is alphabetical and the TRY line was built from its first
  // entry, which in a normal package is `foo.test.ts`: another `deno doc`,
  // arriving nowhere, with `mod.ts` sitting two rows below it.
  const directory = await Deno.realPath(await Deno.makeTempDir());
  try {
    await Deno.mkdir(`${directory}/mypkg`);
    for (const name of ["aaa.test.ts", "mod.ts", "zzz.ts"]) {
      await Deno.writeTextFile(
        `${directory}/mypkg/${name}`,
        coderModule("myStruct", ["a"]),
      );
    }

    const plan = printed(await planCli([`${directory}/mypkg`]));

    assertStringIncludes(plan.text, "aaa.test.ts");
    assertStringIncludes(
      plan.text,
      `TRY\n  binstruct ${directory}/mypkg/mod.ts`,
    );

    // Without a conventional entrypoint the first non-test module is offered,
    // which is still a module the listing above proves exists.
    await Deno.remove(`${directory}/mypkg/mod.ts`);
    const noEntry = printed(await planCli([`${directory}/mypkg`]));

    assertStringIncludes(
      noEntry.text,
      `TRY\n  binstruct ${directory}/mypkg/zzz.ts`,
    );

    // And a directory of nothing but tests still offers one of them rather
    // than dropping the TRY line: it is a module, and it is what is there.
    await Deno.remove(`${directory}/mypkg/zzz.ts`);
    const onlyTests = printed(await planCli([`${directory}/mypkg`]));

    assertStringIncludes(
      onlyTests.text,
      `TRY\n  binstruct ${directory}/mypkg/aaa.test.ts`,
    );
  } finally {
    await Deno.remove(directory, { recursive: true });
  }
});

Deno.test("a malformed file: URL is a refusal, not a stack trace", async () => {
  // `fromFileUrl` sat outside the try that guards the stat, so this escaped as
  // `error: Uncaught (in promise) TypeError: Invalid URL` with a trace through
  // the CLI's own frames.
  const run = await runCli(["file://a b/x", "decode"]);

  assertEquals(run.code, 1);
  assertEquals(run.stdout, "");
  assertStringIncludes(run.stderr, "cannot inspect file://a b/x");
  assertEquals(run.stderr.includes("Uncaught"), false);
  assertEquals(run.stderr.includes("target.ts:"), false);
});

Deno.test("a directory with no modules is refused without a TRY line", async () => {
  // The refusal must never name a command that does not exist, so when there
  // is nothing to name it says so and stops.
  const directory = await Deno.realPath(await Deno.makeTempDir());
  try {
    await Deno.writeTextFile(`${directory}/README.md`, "not a module\n");

    const plan = printed(await planCli([directory, "decode"]));

    assertEquals(plan.code, 1);
    assertStringIncludes(plan.text, "names a directory");
    assertStringIncludes(plan.text, "holds no module files");
    assertEquals(plan.text.includes("README.md"), false);
    assertEquals(plan.text.includes("TRY"), false);
  } finally {
    await Deno.remove(directory, { recursive: true });
  }
});

Deno.test("a .mts entrypoint is a module, not a directory", async () => {
  // `.mts`, `.cts` and `.jsx` were missing from the extension list, so a real
  // module was called a directory and offered `./mypkg/mod.mts/mod.ts`. The
  // extension no longer decides it either way — the stat does — but the list
  // still has to be right, because it is what the directory listing offers.
  const directory = await writeLocalPackage("mod.mts");
  try {
    const run = await runCli(
      ["./mypkg/mod.mts", "decode"],
      ["-A"],
      directory,
      new Uint8Array([7]),
    );

    assertEquals(run.code, 0);
    assertStringIncludes(run.stdout, "7");
    assertEquals(run.stderr.includes("it names a directory"), false);
    assertEquals(run.stderr.includes("mod.mts/mod.ts"), false);
  } finally {
    await Deno.remove(directory, { recursive: true });
  }
});

Deno.test("a specifier is imported exactly as it resolved", async () => {
  // Nothing is substituted for what discovery was asked about. Importing the
  // https://jsr.io/… URL the symbols live at, say, would load the package by a
  // route that bypasses the version and import map the project resolved.
  const plan = await planCli(["png", "pngFile", "decode"]);

  assertEquals(plan.kind, "run");
  if (plan.kind !== "run") return;

  assertEquals(plan.specifier, "jsr:@binstruct/png");
});

Deno.test("the header and the inference notice keep the typed form", async () => {
  // Both used to print the resolved specifier, so a local package announced
  // itself twice as an absolute file:// URL nobody had typed, while every
  // listing and TRY line on the same screen said ./mypkg/mod.ts.
  const directory = await writeLocalPackage();
  try {
    const run = await runCli(
      ["./mypkg/mod.ts", "decode"],
      ["-A"],
      directory,
      new Uint8Array([7]),
    );

    assertEquals(run.code, 0);
    assertStringIncludes(run.stderr, "package: ./mypkg/mod.ts → file://");
    assertStringIncludes(
      run.stderr,
      "using coder: myStruct (only coder in ./mypkg/mod.ts)",
    );
    assertEquals(run.stderr.includes("only coder in file://"), false);
  } finally {
    await Deno.remove(directory, { recursive: true });
  }
});

Deno.test("the header still shows what shorthand expanded to", async () => {
  // The short form leads, but ADR 0004's echo rule stands: a bare name has to
  // be seen becoming jsr:@binstruct/<name>, or the shorthand is a guess.
  const plan = await planCli(["png", "pngFile", "decode"]);

  assertEquals(plan.kind, "run");
  if (plan.kind !== "run") return;

  assertEquals(plan.notices, ["package: png → jsr:@binstruct/png"]);
});

Deno.test("the header does not repeat itself when nothing was expanded", async () => {
  const plan = printed(await planCli([PNG]));

  assertEquals(plan.text.split("\n")[0], `package: ${PNG}`);
  assertEquals(plan.text.includes("→ file://"), false);
});

Deno.test("an unknown flag is refused, and no package is guessed at", async () => {
  const plan = printed(await planCli(["--format", "png", "decode"]));

  assertEquals(plan.stream, "stderr");
  assertEquals(plan.code, 1);
  assertStringIncludes(plan.text, "unknown option: --format");
  assertStringIncludes(plan.text, "shifts which word is the package");
  // The word the flag pushed into the package slot is never resolved.
  assertEquals(plan.text.includes("jsr:@binstruct/decode"), false);
  assertEquals(plan.text.includes("cannot read"), false);
  // The screen still says which flags do exist.
  assertStringIncludes(plan.text, "OPTIONS");
  assertStringIncludes(plan.text, "-p, --package");
});

Deno.test("--help does not excuse an unknown flag either", async () => {
  const plan = printed(await planCli(["--format", "json", "png", "--help"]));

  assertEquals(plan.stream, "stderr");
  assertEquals(plan.code, 1);
  assertStringIncludes(plan.text, "unknown option: --format");
});

Deno.test("an unknown flag beats --version to the answer", async () => {
  // --version reads no positionals, but reporting a version for a command line
  // the parser did not understand says the invocation was fine. It was not.
  const plan = printed(await planCli(["--version", "--format"]));

  assertEquals(plan.stream, "stderr");
  assertEquals(plan.code, 1);
  assertStringIncludes(plan.text, "unknown option: --format");
});

Deno.test("an unknown flag writes nothing to stdout", async () => {
  const run = await runCli(["--format", "json", "png"], OFFLINE);

  assertEquals(run.code, 1);
  assertEquals(run.stdout, "");
  assertStringIncludes(run.stderr, "unknown option: --format");
});

Deno.test("a package word that reads as flags never prints help on stdout", async () => {
  // `-dash/` parsed as -d -a -s -h, the `h` set --help, and the CLI wrote the
  // whole help screen to stdout at exit 0 with no decode having happened —
  // `binstruct -dash/ decode > out.json5` filled the redirect with a help
  // screen, which is exactly what ADR 0001 exists to make impossible.
  const directory = await writeAmbiguousPackage("-dash");
  try {
    const run = await runCli(
      ["-dash/", "decode"],
      OFFLINE,
      directory,
      new Uint8Array([1]),
    );

    assertEquals(run.code, 1);
    assertEquals(run.stdout, "");
    assertStringIncludes(run.stderr, "unknown option: -dash/");
  } finally {
    await Deno.remove(directory, { recursive: true });
  }
});

Deno.test("-- makes a dash-leading package word an ordinary one", async () => {
  const directory = await writeAmbiguousPackage("-dash");
  try {
    const run = await runCli(
      ["--", "-dash/mod.ts", "decode"],
      ["-A"],
      directory,
      new Uint8Array([1, 2]),
    );

    assertEquals(run.code, 0);
    assertStringIncludes(run.stdout, "'a'");
    assertStringIncludes(run.stdout, "'b'");
    assertStringIncludes(run.stderr, "using coder: pair");
  } finally {
    await Deno.remove(directory, { recursive: true });
  }
});

Deno.test("a TRY line for a dash-leading module pastes back and runs", async () => {
  // The refusal of ADR 0004 lists what is in a directory and offers one of the
  // names, and a module file may perfectly well start with a `-`. `shellWord`
  // quotes for the shell and has no notion of one, so the suggestion pasted
  // back as a flag cluster and printed help at exit 0 — a TRY line naming a
  // command that does not run.
  const directory = await writeAmbiguousPackage("-dash");
  try {
    const refusal = await runCli(["--", "-dash/", "decode"], ["-A"], directory);

    assertEquals(refusal.code, 1);
    assertEquals(refusal.stdout, "");
    assertStringIncludes(refusal.stderr, "names a directory");

    const suggestion = refusal.stderr
      .split("TRY\n  binstruct ")[1]
      .split("\n")[0];

    assertEquals(suggestion, "-- -dash/mod.ts");

    const shell = new Deno.Command("sh", {
      args: [
        "-c",
        `printf '\\1\\2' | "$0" run -A "$1" ${suggestion} decode`,
        Deno.execPath(),
        CLI,
      ],
      cwd: directory,
      stdout: "piped",
      stderr: "piped",
    });
    const output = await shell.output();

    assertEquals(output.code, 0);
    assertStringIncludes(new TextDecoder().decode(output.stdout), "'a'");
  } finally {
    await Deno.remove(directory, { recursive: true });
  }
});

Deno.test("a colon inside a path segment is a path, not a scheme", async () => {
  // `^[a-z][a-z0-9+.-]+:` matched `my:`, so this was classified `scheme`: not
  // anchored to the working directory and not stat'ed, while `deno doc`
  // resolved it against the working directory as the path it is. Discovery
  // listed the local module and import() then looked for `my:dir/mod.ts` next
  // to the CLI's own sources — the divergence, one more spelling.
  const directory = await writeAmbiguousPackage("my:dir");
  try {
    const run = await runCli(
      ["my:dir/mod.ts", "decode"],
      ["-A"],
      directory,
      new Uint8Array([1, 2]),
    );

    assertEquals(run.code, 0);
    assertStringIncludes(run.stdout, "'a'");
    assertStringIncludes(run.stdout, "'b'");
    assertStringIncludes(run.stderr, "package: my:dir/mod.ts → file://");

    // And the directory spelling reaches the refusal, as any other path does.
    const refused = await runCli(
      ["my:dir/", "decode"],
      ["-A"],
      directory,
      new Uint8Array([1, 2]),
    );

    assertEquals(refused.code, 1);
    assertEquals(refused.stdout, "");
    assertStringIncludes(refused.stderr, "names a directory");
  } finally {
    await Deno.remove(directory, { recursive: true });
  }
});

Deno.test("a node: word is not a scheme, and a local file of that name loads", async () => {
  // `node:` and `data:` were in the scheme set because `import()` resolves
  // them, which is the wrong question: the set is the schemes a *package* can
  // live behind, and a runtime built-in hosts none. Keeping them was the
  // discovery-versus-execution divergence a third time — `deno doc` resolved a
  // positional `node:evil.ts` against the working directory and listed the
  // local file's coder, then `import()` asked for a built-in module and died
  // with `No such built-in module: node:evil.ts`.
  const directory = await Deno.realPath(await Deno.makeTempDir());
  try {
    await Deno.writeTextFile(
      `${directory}/node:evil.ts`,
      coderModule("evilStruct", ["a"]),
    );

    const run = await runCli(
      ["node:evil.ts", "decode"],
      ["-A"],
      directory,
      new Uint8Array([7]),
    );

    assertEquals(run.code, 0);
    assertStringIncludes(run.stdout, "7");
    assertStringIncludes(run.stderr, "package: node:evil.ts → file://");
    assertEquals(run.stderr.includes("No such built-in module"), false);
  } finally {
    await Deno.remove(directory, { recursive: true });
  }
});

Deno.test("an environmental failure is not blamed on the package name", async () => {
  // A malformed deno.json in the working directory used to be reported as
  // "cannot read jsr:@binstruct/png", with png right there in the listing.
  const directory = await Deno.makeTempDir();
  try {
    await Deno.writeTextFile(
      `${directory}/deno.json`,
      '{ "imports": { "a": } }\n',
    );

    const broken = await runCli(["png"], ["-A"], directory);

    assertEquals(broken.code, 1);
    assertStringIncludes(broken.stderr, "cannot list the coders in png");
    assertStringIncludes(broken.stderr, "naming the coder yourself");
    assertEquals(broken.stderr.includes("a bare name always means"), false);
  } finally {
    await Deno.remove(directory, { recursive: true });
  }
});
