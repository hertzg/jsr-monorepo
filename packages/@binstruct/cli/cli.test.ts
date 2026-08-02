/**
 * Tests for the Binary Structure CLI.
 *
 * Discovery-backed cases point at packages inside this repository rather than
 * at JSR, so `deno doc` resolves them from disk and nothing here needs the
 * network. `arp` has exactly one zero-argument coder, `png` has three plus one
 * that takes an argument, `pcap` has none that the CLI can call, and
 * `@hertzg/mac` is not a binstruct package at all.
 */

import {
  assertEquals,
  assertNotEquals,
  assertStringIncludes,
} from "@std/assert";
import { toFileUrl } from "@std/path";
import { explainFailure, parseCliArgs, planCli } from "./cli.ts";

/** A package with exactly one zero-argument coder, `arpData`. */
const ARP = import.meta.resolve("../arp/mod.ts");

/** A package with three zero-argument coders and one that takes an argument. */
const PNG = import.meta.resolve("../png/mod.ts");

/** A package whose every coder takes an argument. */
const PCAP = import.meta.resolve("../pcap/mod.ts");

/** A package that is not built on binstruct. */
const MAC = import.meta.resolve("../../@hertzg/mac/mod.ts");

/** This CLI, for the subprocess tests. */
const CLI = import.meta.resolve("./cli.ts");

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
 * Writes a one-coder package into a fresh directory, as `<dir>/mypkg/<entry>`.
 *
 * It imports `@hertzg/binstruct` by absolute URL so the fixture needs no
 * `deno.json` of its own, which keeps the working directory free of anything
 * that could change how the CLI resolves what it is given. `mypkg` holds the
 * entrypoint and nothing else, which is what lets `deno doc` be pointed at the
 * directory.
 *
 * @param entry Name of the entrypoint module, for the extension cases
 * @returns The containing directory, realpathed, to be removed by the caller
 */
async function writeLocalPackage(entry = "mod.ts"): Promise<string> {
  const directory = await Deno.realPath(await Deno.makeTempDir());
  const binstruct = import.meta.resolve("../../@hertzg/binstruct/mod.ts");

  await Deno.mkdir(`${directory}/mypkg`);
  await Deno.writeTextFile(
    `${directory}/mypkg/${entry}`,
    [
      `import { type Coder, struct, u8 } from "${binstruct}";`,
      "",
      "/** A one-byte structure that exists only in this directory. */",
      "export function myStruct(): Coder<{ a: number }> {",
      "  return struct({ a: u8() });",
      "}",
      "",
    ].join("\n"),
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
    "exposes 3 coders, so the coder word is required",
  );
  assertStringIncludes(plan.text, "needs 1 argument");
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
  assertStringIncludes(plan.text, "exposes 3 coders");
});

Deno.test("an unknown package is answered with the package list", async () => {
  const plan = printed(await planCli(["./no-such-package.ts"]));

  assertEquals(plan.code, 1);
  assertStringIncludes(plan.text, "cannot read file://");
  assertStringIncludes(plan.text, "no-such-package.ts");
  assertStringIncludes(plan.text, "Module not found");
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
  const plan = printed(await planCli([PCAP]));

  assertEquals(plan.code, 1);
  assertStringIncludes(
    plan.text,
    "takes arguments, which the CLI cannot supply",
  );
  assertStringIncludes(plan.text, "pcapFile — 1 required");
  assertStringIncludes(plan.text, "NEXT  <package>");
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
  const text = await explainFailure(PCAP, "pcapFile", new Error("boom"));

  assertStringIncludes(text, "takes arguments, which the CLI cannot supply");
  assertEquals(text.includes("Error: boom"), false);
});

Deno.test("an incomplete invocation writes nothing to stdout and exits 1", async () => {
  const bare = await runCli([]);

  assertEquals(bare.code, 1);
  assertEquals(bare.stdout, "");
  assertStringIncludes(bare.stderr, "NEXT  <package>");

  const halfTyped = await runCli([PNG]);

  assertEquals(halfTyped.code, 1);
  assertEquals(halfTyped.stdout, "");
  assertStringIncludes(halfTyped.stderr, "NEXT  <coder>");
});

Deno.test("--help writes nothing to stderr and exits 0", async () => {
  const help = await runCli(["--help"]);

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
  });
});

Deno.test("parseCliArgs treats a blank word as a missing one", () => {
  assertEquals(parseCliArgs(["png", "", "decode"]).coder, undefined);
  assertEquals(parseCliArgs(["png", "", "decode"]).command, "decode");
  assertEquals(parseCliArgs(["-p", "png", "-c", "   "]).coder, undefined);
  assertEquals(parseCliArgs([""]).package, undefined);
  assertEquals(parseCliArgs(["-p", ""]).package, undefined);
});

Deno.test("a blank coder word asks which coder instead of importing", async () => {
  const plan = printed(await planCli([PNG, "", "decode"]));

  assertEquals(plan.code, 1);
  assertStringIncludes(plan.text, "NEXT  <coder>");
  assertEquals(plan.text.includes("no coder named ''"), false);
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
  // pcapFile(endianness) called bare defaults to big-endian and decodes a
  // little-endian capture into plausible, wrong numbers with exit 0.
  const plan = printed(await planCli([PCAP, "pcapFile", "decode"]));

  assertEquals(plan.stream, "stderr");
  assertEquals(plan.code, 1);
  assertStringIncludes(
    plan.text,
    "takes arguments, which the CLI cannot supply",
  );
});

Deno.test("a named coder that takes arguments still lists the callable ones", async () => {
  const plan = printed(await planCli([PNG, "pngFileChunks", "decode"]));

  assertEquals(plan.code, 1);
  assertStringIncludes(plan.text, "pngFileChunks takes 1 argument");
  assertStringIncludes(plan.text, "NEXT  <coder>");
  assertStringIncludes(plan.text, `TRY\n  binstruct ${PNG} pngChunkUnknown`);
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

Deno.test("a directory is imported as the module deno doc resolved", async () => {
  // `deno doc ./mypkg` documents ./mypkg/mod.ts while import() refuses the
  // directory outright, so the CLI listed the coder, announced it, printed a
  // TRY line for the command, and then died with ERR_UNSUPPORTED_DIR_IMPORT.
  // The module deno doc reports is what gets imported, so the two cannot
  // disagree — and the directory simply works.
  const directory = await writeLocalPackage();
  try {
    const plan = await planCli([`${directory}/mypkg`, "decode"]);

    assertEquals(plan.kind, "run");
    if (plan.kind !== "run") return;

    assertEquals(plan.specifier, toFileUrl(`${directory}/mypkg/mod.ts`).href);
    assertEquals(plan.coder, "myStruct");
  } finally {
    await Deno.remove(directory, { recursive: true });
  }
});

Deno.test("a directory spelled as a file: URL is not a way round the rule", async () => {
  // The header prints `→ file:///…` for every local path and `--docs` prints
  // `Defined in file:///…`, so this spelling is one the CLI itself teaches.
  // Classifying by spelling let it past every local rule and straight into
  // ERR_UNSUPPORTED_DIR_IMPORT; classification does not decide it any more.
  const directory = await writeLocalPackage();
  try {
    const url = toFileUrl(`${directory}/mypkg`).href;
    const plan = await planCli([url, "decode"]);

    assertEquals(plan.kind, "run");
    if (plan.kind !== "run") return;

    assertEquals(plan.specifier, `${url}/mod.ts`);
    assertEquals(plan.coder, "myStruct");
  } finally {
    await Deno.remove(directory, { recursive: true });
  }
});

Deno.test("a directory decodes, whichever way it is spelled", async () => {
  const directory = await writeLocalPackage();
  try {
    for (
      const spelling of ["./mypkg", toFileUrl(`${directory}/mypkg`).href]
    ) {
      const run = await runCli(
        [spelling, "decode"],
        ["-A"],
        directory,
        new Uint8Array([7]),
      );

      assertEquals(run.code, 0);
      assertStringIncludes(run.stdout, "7");
      assertEquals(run.stderr.includes("ERR_UNSUPPORTED_DIR_IMPORT"), false);
      assertEquals(run.stderr.includes("it names a directory"), false);
    }
  } finally {
    await Deno.remove(directory, { recursive: true });
  }
});

Deno.test("a .mts entrypoint is a module, not a directory", async () => {
  // `.mts`, `.cts` and `.jsx` were missing from the extension list, so a real
  // module was called a directory and offered `./mypkg/mod.mts/mod.ts`.
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

Deno.test("a registry specifier is imported exactly as it was typed", async () => {
  // The entrypoint substitution is scoped to local specifiers: swapping in the
  // https://jsr.io/… URL the symbols live at would import the package by a
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
