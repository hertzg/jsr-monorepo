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

import { parseArgs } from "node:util";
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
 * const result = main(["-p", "jsr:@binstruct/png", "-c", "pngFile", "decode"]);
 * assertEquals(result instanceof Promise, true);
 * ```
 */
function parseCliArgs(args: string[]): CliOptions {
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

/**
 * Shows help information for the CLI.
 */
function showHelp(): void {
  console.log(`
Binary Structure CLI Tool

USAGE:
    deno run -A @binstruct/cli [OPTIONS] <COMMAND>

OPTIONS:
    -p, --package <PACKAGE>    Package specifier (JSR URL, local path, or npm package)
    -c, --coder <CODER>        Coder name to use from the package
    -h, --help                 Show help information
    -v, --version              Show version information

COMMANDS:
    decode                     Decode binary data from stdin to JSON on stdout
    encode                     Encode JSON data from stdin to binary on stdout

EXAMPLES:
    # Decode PNG file using JSR package
    deno run -A @binstruct/cli -p jsr:@binstruct/png -c pngFile decode < input.png > struct.json
    
    # Encode JSON to PNG file using JSR package
    deno run -A @binstruct/cli -p jsr:@binstruct/png -c pngFile encode < struct.json > output.png
    
    # Decode with local package
    deno run -A @binstruct/cli -p ./my-package -c myStruct decode < input.bin > output.json
    
    # Encode with local package
    deno run -A @binstruct/cli -p ./my-package -c myStruct encode < input.json > output.bin
    
    # Decode with npm package
    deno run -A @binstruct/cli -p npm:my-binary-package -c myCoder decode < input.bin > output.json
    
    # Encode with npm package
    deno run -A @binstruct/cli -p npm:my-binary-package -c myCoder encode < input.json > output.bin
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
 * await main();
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
        await decodeCommand(options.package, options.coder);
        break;
      case "encode":
        await encodeCommand(options.package, options.coder);
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
