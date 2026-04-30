/**
 * MikroTik API reply parser
 *
 * Parses reply sentences into structured data.
 */

/**
 * Done reply (!done)
 *
 * Indicates successful completion of a command. May contain optional
 * attributes with additional information.
 */
export type DoneReply = {
  /** Reply type discriminator */
  type: "done";
  /** Optional attributes returned with the done reply */
  attributes?: Record<string, string>;
};

/**
 * Data reply (!re)
 *
 * Contains data returned by a command (e.g., list of interfaces).
 * Multiple data replies may be sent before a done reply.
 */
export type DataReply = {
  /** Reply type discriminator */
  type: "re";
  /** Attributes containing the reply data */
  attributes: Record<string, string>;
};

/**
 * Trap reply (!trap)
 *
 * Indicates a non-fatal error occurred during command execution.
 * The command may continue or be terminated depending on the error.
 */
export type TrapReply = {
  /** Reply type discriminator */
  type: "trap";
  /** Human-readable error message */
  message: string;
  /** Optional numeric error category */
  category?: number;
  /** Optional additional attributes */
  attributes?: Record<string, string>;
};

/**
 * Fatal reply (!fatal)
 *
 * Indicates a fatal error that terminates the connection.
 * The client should close the connection after receiving this.
 */
export type FatalReply = {
  /** Reply type discriminator */
  type: "fatal";
  /** Human-readable error message */
  message: string;
};

/**
 * Union of all possible reply types
 *
 * Use type guards (isDone, isData, isTrap, isFatal) to narrow the type.
 */
export type Reply = DoneReply | DataReply | TrapReply | FatalReply;

/**
 * Parses a reply sentence into a structured Reply object
 *
 * Converts an array of words from a sentence into a typed Reply object.
 * The first word determines the reply type (!done, !re, !trap, !fatal).
 *
 * @param words - Array of words from the decoded sentence
 * @returns Parsed reply object with appropriate type
 *
 * @example Parse a done reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseReply, isDone } from "@hertzg/routeros-api/protocol/reply";
 *
 * const reply = parseReply(["!done"]);
 * assertEquals(reply.type, "done");
 * if (isDone(reply)) {
 *   assertEquals(reply.attributes, undefined);
 * }
 * ```
 *
 * @example Parse a data reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseReply, isData } from "@hertzg/routeros-api/protocol/reply";
 *
 * const reply = parseReply(["!re", "=name=ether1", "=type=ether"]);
 * assertEquals(reply.type, "re");
 * if (isData(reply)) {
 *   assertEquals(reply.attributes.name, "ether1");
 *   assertEquals(reply.attributes.type, "ether");
 * }
 * ```
 *
 * @example Parse a trap (error) reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseReply, isTrap } from "@hertzg/routeros-api/protocol/reply";
 *
 * const reply = parseReply(["!trap", "=message=no such item"]);
 * assertEquals(reply.type, "trap");
 * if (isTrap(reply)) {
 *   assertEquals(reply.message, "no such item");
 * }
 * ```
 */
export function parseReply(words: string[]): Reply {
  if (words.length === 0) {
    throw new Error("Cannot parse empty reply");
  }

  const replyType = words[0];

  // Parse attributes from words (=key=value and .key=value formats)
  const attributes: Record<string, string> = {};
  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    // Handle both regular attributes (=key=value) and API attributes (.key=value)
    if (word.startsWith("=") || word.startsWith(".")) {
      const equalsIndex = word.indexOf("=", 1);
      if (equalsIndex > 0) {
        const key = word.substring(word.startsWith(".") ? 0 : 1, equalsIndex);
        const value = word.substring(equalsIndex + 1);
        attributes[key] = value;
      }
    }
  }

  switch (replyType) {
    case "!done":
      return Object.keys(attributes).length > 0
        ? { type: "done", attributes }
        : { type: "done" };

    case "!re":
      return { type: "re", attributes };

    case "!trap": {
      const message = attributes["message"] ?? "Unknown error";
      const category = attributes["category"]
        ? parseInt(attributes["category"], 10)
        : undefined;

      // Remove message and category from attributes
      const { message: _, category: __, ...restAttributes } = attributes;

      return Object.keys(restAttributes).length > 0
        ? { type: "trap", message, category, attributes: restAttributes }
        : { type: "trap", message, category };
    }

    case "!fatal": {
      const message = attributes["message"] ?? "Fatal error";
      return { type: "fatal", message };
    }

    default:
      throw new Error(`Unknown reply type: ${replyType}`);
  }
}

/**
 * Checks if a reply is a done reply
 *
 * Type guard function that narrows the Reply type to DoneReply.
 *
 * @param reply - The reply to check
 * @returns True if the reply is a DoneReply
 *
 * @example Use type guard to narrow reply type
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseReply, isDone } from "@hertzg/routeros-api/protocol/reply";
 *
 * const reply = parseReply(["!done", ".tag=abc123"]);
 * if (isDone(reply)) {
 *   // TypeScript knows reply is DoneReply here
 *   assertEquals(reply.attributes?.[".tag"], "abc123");
 * }
 * ```
 */
export function isDone(reply: Reply): reply is DoneReply {
  return reply.type === "done";
}

/**
 * Checks if a reply is a data reply
 *
 * Type guard function that narrows the Reply type to DataReply.
 *
 * @param reply - The reply to check
 * @returns True if the reply is a DataReply
 *
 * @example Use type guard to access data attributes
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseReply, isData } from "@hertzg/routeros-api/protocol/reply";
 *
 * const reply = parseReply(["!re", "=name=ether1"]);
 * if (isData(reply)) {
 *   // TypeScript knows reply.attributes is defined here
 *   assertEquals(reply.attributes.name, "ether1");
 * }
 * ```
 */
export function isData(reply: Reply): reply is DataReply {
  return reply.type === "re";
}

/**
 * Checks if a reply is a trap (error) reply
 *
 * Type guard function that narrows the Reply type to TrapReply.
 *
 * @param reply - The reply to check
 * @returns True if the reply is a TrapReply
 *
 * @example Handle trap errors
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseReply, isTrap } from "@hertzg/routeros-api/protocol/reply";
 *
 * const reply = parseReply(["!trap", "=message=no such item"]);
 * if (isTrap(reply)) {
 *   // TypeScript knows reply has message property here
 *   assertEquals(reply.message, "no such item");
 * }
 * ```
 */
export function isTrap(reply: Reply): reply is TrapReply {
  return reply.type === "trap";
}

/**
 * Checks if a reply is a fatal reply
 *
 * Type guard function that narrows the Reply type to FatalReply.
 *
 * @param reply - The reply to check
 * @returns True if the reply is a FatalReply
 *
 * @example Handle fatal errors
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseReply, isFatal } from "@hertzg/routeros-api/protocol/reply";
 *
 * const reply = parseReply(["!fatal", "=message=connection terminated"]);
 * if (isFatal(reply)) {
 *   // TypeScript knows reply has message property here
 *   assertEquals(reply.message, "connection terminated");
 * }
 * ```
 */
export function isFatal(reply: Reply): reply is FatalReply {
  return reply.type === "fatal";
}
