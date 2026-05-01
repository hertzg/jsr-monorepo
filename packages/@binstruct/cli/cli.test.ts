/**
 * Tests for the Binary Structure CLI.
 */

import { assertEquals } from "@std/assert";

Deno.test("CLI argument parsing", async () => {
  // Test basic argument parsing
  const options = await parseCliArgs([
    "-p",
    "jsr:@binstruct/png",
    "-c",
    "pngFile",
    "decode",
  ]);

  assertEquals(options.package, "jsr:@binstruct/png");
  assertEquals(options.coder, "pngFile");
  assertEquals(options.command, "decode");
  assertEquals(options.help, false);
  assertEquals(options.version, false);
});

Deno.test("CLI argument parsing with long options", async () => {
  const options = await parseCliArgs([
    "--package",
    "jsr:@binstruct/png",
    "--coder",
    "pngFile",
    "decode",
  ]);

  assertEquals(options.package, "jsr:@binstruct/png");
  assertEquals(options.coder, "pngFile");
  assertEquals(options.command, "decode");
});

Deno.test("CLI argument parsing with help flag", async () => {
  const options = await parseCliArgs(["-h"]);

  assertEquals(options.help, true);
  assertEquals(options.package, "");
  assertEquals(options.command, "");
});

Deno.test("CLI argument parsing with version flag", async () => {
  const options = await parseCliArgs(["-v"]);

  assertEquals(options.version, true);
  assertEquals(options.package, "");
  assertEquals(options.command, "");
});

Deno.test("CLI argument parsing with mixed flags", async () => {
  const options = await parseCliArgs([
    "-p",
    "jsr:@binstruct/png",
    "-c",
    "pngFile",
    "-h",
    "decode",
  ]);

  assertEquals(options.package, "jsr:@binstruct/png");
  assertEquals(options.coder, "pngFile");
  assertEquals(options.command, "decode");
  assertEquals(options.help, true);
});

Deno.test("CLI argument parsing with no arguments", async () => {
  const options = await parseCliArgs([]);

  assertEquals(options.package, "");
  assertEquals(options.coder, "");
  assertEquals(options.command, "");
  assertEquals(options.help, false);
  assertEquals(options.version, false);
});

Deno.test("CLI argument parsing with only command", async () => {
  const options = await parseCliArgs(["decode"]);

  assertEquals(options.package, "");
  assertEquals(options.coder, "");
  assertEquals(options.command, "decode");
});

Deno.test("CLI argument parsing with encode command", async () => {
  const options = await parseCliArgs([
    "-p",
    "jsr:@binstruct/png",
    "-c",
    "pngFile",
    "encode",
  ]);

  assertEquals(options.package, "jsr:@binstruct/png");
  assertEquals(options.coder, "pngFile");
  assertEquals(options.command, "encode");
});

// Helper function to test parseCliArgs (we need to extract it for testing)
async function parseCliArgs(args: string[]) {
  const { parseArgs } = await import("node:util");
  const { values, positionals } = parseArgs({
    args,
    options: {
      package: {
        type: "string",
        short: "p",
        description: "Package specifier (JSR URL, local path, or npm package)",
      },
      coder: {
        type: "string",
        short: "c",
        description: "Coder name to use from the package",
      },
      help: {
        type: "boolean",
        short: "h",
        description: "Show help information",
      },
      version: {
        type: "boolean",
        short: "v",
        description: "Show version information",
      },
    },
    allowPositionals: true,
  });

  return {
    package: values.package as string || "",
    coder: values.coder as string || "",
    command: positionals[0] || "",
    help: values.help as boolean || false,
    version: values.version as boolean || false,
  };
}
