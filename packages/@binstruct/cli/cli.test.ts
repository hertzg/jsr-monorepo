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
 * and each gets to build its own `TRY` line; `spaced dir/aaa_other.ts` sorts
 * first, so it is what the directory refusal offers.
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
        `TRY\n  binstruct '${pkg}/aaa_other.ts'`,
      );
    });

    await t.step("the `file:` spelling the header teaches", async () => {
      const plan = printed(await planCli([`file://${pkg}`, "decode"]));

      assertStringIncludes(
        plan.text,
        `TRY\n  binstruct 'file://${pkg}/aaa_other.ts'`,
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
        `printf '\\1' | "$0" run -A "$1" ${suggestion} decode`,
        Deno.execPath(),
        CLI,
      ],
      cwd: directory,
      stdout: "piped",
      stderr: "piped",
    });
    const output = await shell.output();

    assertEquals(output.code, 0);
    assertStringIncludes(new TextDecoder().decode(output.stdout), "'z'");
  } finally {
    await Deno.remove(directory, { recursive: true });
  }
});

Deno.test("a symlink the refusal offers is one that loads", async () => {
  // `Deno.readDir` does not follow links, so a dangling `aaa_link.ts` was
  // listed as a module and — sorting first — became the `TRY` line, which then
  // failed with `no such path`. A `*.ts` link to a directory landed back on
  // the directory refusal. The refusal's only suggestion must work.
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
      `TRY\n  binstruct ${directory}/mypkg/aaa_other.ts`,
    );

    // And the suggestion loads, rather than bouncing off another refusal.
    const run = await runCli(
      ["./mypkg/aaa_other.ts", "decode"],
      ["-A"],
      directory,
      new Uint8Array([1]),
    );

    assertEquals(run.code, 0);
    assertStringIncludes(run.stdout, "'z'");
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
