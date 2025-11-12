/**
 * MikroTik API command builder
 *
 * Builds command sentences from structured data.
 */

/**
 * MikroTik API command structure
 *
 * Represents a command with optional attributes and query parameters.
 * Commands are converted to word arrays for transmission over the API.
 */
export type Command = {
  /** The command path (e.g., "/interface/print", "/login") */
  command: string;
  /** Optional attributes (e.g., {".id": "ether1", "disabled": "yes"}) */
  attributes?: Record<string, string | number | boolean>;
  /** Optional query parameters for filtering results */
  queries?: Record<string, string | number | boolean>;
};

/**
 * Builds a command sentence from structured data
 *
 * @param command - Command path (e.g., "/interface/print")
 * @param options - Optional attributes and query parameters
 * @returns Array of words ready to be encoded
 *
 * @example Build a simple command
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { buildCommand } from "@hertzg/routeros-api/protocol/command";
 *
 * const words = buildCommand("/interface/print");
 * assertEquals(words, ["/interface/print"]);
 * ```
 *
 * @example Build command with attributes
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { buildCommand } from "@hertzg/routeros-api/protocol/command";
 *
 * const words = buildCommand("/interface/set", {
 *   attributes: { "name": "ether1-new", "disabled": "yes" }
 * });
 * assertEquals(words, ["/interface/set", "=name=ether1-new", "=disabled=yes"]);
 * ```
 *
 * @example Build command with queries
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { buildCommand } from "@hertzg/routeros-api/protocol/command";
 *
 * const words = buildCommand("/interface/print", {
 *   queries: { "name": "ether1" }
 * });
 * assertEquals(words, ["/interface/print", "?name=ether1"]);
 * ```
 */
export function buildCommand(command: string, options?: {
  attributes?: Record<string, string | number | boolean>;
  queries?: Record<string, string | number | boolean>;
}): string[] {
  const words: string[] = [command];

  // Add attribute words (=name=value)
  if (options?.attributes) {
    for (const [key, value] of Object.entries(options.attributes)) {
      words.push(`=${key}=${value}`);
    }
  }

  // Add query words (?name=value)
  if (options?.queries) {
    for (const [key, value] of Object.entries(options.queries)) {
      words.push(`?${key}=${value}`);
    }
  }

  return words;
}

/**
 * Builds a command sentence from a Command object
 *
 * Convenience function that converts a Command object into an array of words
 * ready for encoding. This is a wrapper around buildCommand().
 *
 * @param cmd - The Command object to convert
 * @returns Array of words representing the command
 *
 * @example Convert Command to words
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { commandToWords } from "@hertzg/routeros-api/protocol/command";
 *
 * const cmd = {
 *   command: "/interface/print",
 *   attributes: { ".proplist": "name,type" }
 * };
 * const words = commandToWords(cmd);
 * assertEquals(words, ["/interface/print", "=.proplist=name,type"]);
 * ```
 *
 * @example Convert complex command
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { commandToWords } from "@hertzg/routeros-api/protocol/command";
 *
 * const cmd = {
 *   command: "/interface/set",
 *   attributes: { ".id": "ether1", "comment": "WAN" },
 *   queries: { "disabled": "no" }
 * };
 * const words = commandToWords(cmd);
 * assertEquals(words.length, 4); // command + 2 attributes + 1 query
 * assertEquals(words[0], "/interface/set");
 * ```
 */
export function commandToWords(cmd: Command): string[] {
  return buildCommand(cmd.command, {
    attributes: cmd.attributes,
    queries: cmd.queries,
  });
}
