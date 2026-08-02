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
 * @returns Exit code and decoded output
 */
async function runCli(
  args: string[],
  permissions: string[] = ["-A"],
): Promise<{ code: number; stdout: string; stderr: string }> {
  const command = new Deno.Command(Deno.execPath(), {
    args: ["run", ...permissions, CLI, ...args],
    stdin: "null",
    stdout: "piped",
    stderr: "piped",
  });
  const output = await command.output();
  const decoder = new TextDecoder();

  return {
    code: output.code,
    stdout: decoder.decode(output.stdout),
    stderr: decoder.decode(output.stderr),
  };
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
  assertStringIncludes(plan.text, "  decode  binary on stdin");
  assertStringIncludes(plan.text, "  encode  JSON on stdin");
  assertStringIncludes(plan.text, `TRY\n  binstruct ${PNG} pngFile decode`);
});

Deno.test("a complete invocation runs, and announces the resolved specifier", async () => {
  const plan = await planCli(["png", "pngFile", "decode"]);

  assertEquals(plan.kind, "run");
  if (plan.kind !== "run") return;

  assertEquals(plan.specifier, "jsr:@binstruct/png");
  assertEquals(plan.coder, "pngFile");
  assertEquals(plan.command, "decode");
  assertEquals(plan.notices, ["package: jsr:@binstruct/png"]);
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
  assertStringIncludes(plan.text, "cannot read ./no-such-package.ts");
  assertStringIncludes(plan.text, "Module not found");
  assertStringIncludes(plan.text, "NEXT  <package>");
  assertEquals(plan.text.includes("["), false);
});

Deno.test("a bare name that cannot be read explains the implied scope", async () => {
  const plan = printed(await planCli(["definitely-not-a-package"]));

  assertEquals(plan.code, 1);
  assertStringIncludes(
    plan.text,
    "package: jsr:@binstruct/definitely-not-a-package",
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

  assertStringIncludes(text, "cannot read ./no-such-package.ts: boom");
  assertStringIncludes(text, "NEXT  <package>");
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
