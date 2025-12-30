#!/usr/bin/env -S deno run -A

/**
 * Binary Structure CLI Tool
 *
 * A command-line interface for decoding binary files using binstruct packages.
 * Supports various binary formats through JSR packages.
 *
 * @example Basic usage
 * ```bash
 * deno run -A @binstruct/cli -p jsr:@binstruct/png -c pngFile decode < input.png > struct.json
 * ```
 *
 * @example With custom package
 * ```bash
 * deno run -A @binstruct/cli -p ./my-package -c myStruct decode < input.bin > output.json
 * ```
 *
 * @module
 */

import { parseArgs } from "@std/cli";
import { decodeCommand } from "./commands/decode.ts";
import { encodeCommand } from "./commands/encode.ts";

/**
 * CLI configuration options.
 */
export interface CliOptions {
  /** Package specifier (JSR URL, local path, or npm package) */
  package: string;
  /** Coder name to use from the package */
  coder: string;
  /** Command to execute */
  command: string;
  /** Show help information */
  help: boolean;
  /** Show version information */
  version: boolean;
}

/**
 * Parses command line arguments and returns configuration.
 *
 * @param args Command line arguments
 * @returns Parsed CLI options
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { main } from "./cli.ts";
 *
 * // The parseCliArgs function is used internally by main
 * const result = main(["--help"]);
 * assertEquals(result instanceof Promise, true);
 * ```
 */
function parseCliArgs(args: string[]): CliOptions {
  const parsed = parseArgs(args, {
    string: ["package", "coder"],
    boolean: ["help", "version"],
    alias: {
      package: "p",
      coder: "c",
      help: "h",
      version: "v",
    },
  });

  // Support both syntaxes:
  // 1. -p <PACKAGE> -c <CODER> <COMMAND> (current)
  // 2. <PACKAGE> <CODER> <COMMAND> (new)

  const packageValue = parsed.package || "";
  const coderValue = parsed.coder || "";
  const commandValue = typeof parsed._[0] === "string" ? parsed._[0] : "";

  // If no flags were used, try positional arguments
  if (!packageValue && !coderValue && parsed._.length >= 3) {
    return {
      package: typeof parsed._[0] === "string" ? parsed._[0] : "",
      coder: typeof parsed._[1] === "string" ? parsed._[1] : "",
      command: typeof parsed._[2] === "string" ? parsed._[2] : "",
      help: parsed.help || false,
      version: parsed.version || false,
    };
  }

  return {
    package: packageValue,
    coder: coderValue,
    command: commandValue,
    help: parsed.help || false,
    version: parsed.version || false,
  };
}

/**
 * Shows help information for the CLI.
 */
function showHelp(): void {
  console.log(`
Binary Structure CLI Tool

USAGE:
    deno run -A @binstruct/cli [OPTIONS] <COMMAND>
    deno run -A @binstruct/cli <PACKAGE> <CODER> <COMMAND>

OPTIONS:
    -p, --package <PACKAGE>    Package specifier (JSR URL, local path, or npm package)
    -c, --coder <CODER>        Coder name to use from the package
    -h, --help                 Show help information
    -v, --version              Show version information

COMMANDS:
    decode                     Decode binary data from stdin to JSON on stdout
    encode                     Encode JSON data from stdin to binary on stdout

EXAMPLES:
    # Using flags (recommended) - JSON output
    deno run -A @binstruct/cli -p jsr:@binstruct/png -c pngFile decode < input.png > struct.json
    deno run -A @binstruct/cli -p jsr:@binstruct/png -c pngFile encode < struct.json > output.png
    
    # Using positional arguments - JSON output
    deno run -A @binstruct/cli jsr:@binstruct/png pngFile decode < input.png > struct.json
    deno run -A @binstruct/cli jsr:@binstruct/png pngFile encode < struct.json > output.png
    
    # With local packages
    deno run -A @binstruct/cli ./my-package myStruct decode < input.bin > output.json
    deno run -A @binstruct/cli ./my-package myStruct encode < input.json > output.bin
    
    # With npm packages
    deno run -A @binstruct/cli npm:my-binary-package myCoder decode < input.bin > output.json
    deno run -A @binstruct/cli npm:my-binary-package myCoder encode < input.json > output.bin
`);
}

/**
 * Shows version information.
 */
function showVersion(): void {
  console.log("@binstruct/cli v0.1.0");
}

/**
 * Main CLI entry point.
 *
 * @param args Command line arguments (defaults to Deno.args)
 *
 * @example
 * ```ts
 * import { main } from "./cli.ts";
 *
 * // Called automatically when run as script
 * // Show help information
 * await main(["--help"]);
 * ```
 */
export async function main(args: string[] = Deno.args): Promise<void> {
  const options = parseCliArgs(args);

  if (options.help) {
    showHelp();
    return;
  }

  if (options.version) {
    showVersion();
    return;
  }

  if (!options.package) {
    console.error("Error: Package specifier is required (-p, --package)");
    console.error("Use --help for usage information");
    Deno.exit(1);
  }

  if (!options.coder) {
    console.error("Error: Coder name is required (-c, --coder)");
    console.error("Use --help for usage information");
    Deno.exit(1);
  }

  if (!options.command) {
    console.error("Error: Command is required");
    console.error("Use --help for usage information");
    Deno.exit(1);
  }

  try {
    switch (options.command) {
      case "decode":
        await decodeCommand(options.package, options.coder, "jsonc");
        break;
      case "encode":
        await encodeCommand(options.package, options.coder, "jsonc");
        break;
      default:
        console.error(`Error: Unknown command '${options.command}'`);
        console.error("Use --help for usage information");
        Deno.exit(1);
    }
  } catch (error) {
    console.error(
      `Error: ${error instanceof Error ? error.message : String(error)}`,
    );
    Deno.exit(1);
  }
}

// Run main function if this file is executed directly
if (import.meta.main) {
  await main();
}
