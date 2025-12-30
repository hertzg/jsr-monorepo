/**
 * MikroTik API Client
 *
 * High-level client for MikroTik Router API with automatic tagging and multiplexing
 */

import { createApiDecodeStream } from "./streams/decode.ts";
import { createApiEncodeStream } from "./streams/encode.ts";
import type { Command } from "./protocol/command.ts";
import type { Reply } from "./protocol/reply.ts";
import { isDone, isFatal } from "./protocol/reply.ts";

/**
 * Client connection options
 *
 * Provides the readable and writable streams for the underlying connection.
 * These streams are typically obtained from a TCP or TLS connection.
 */
export type ClientOptions = {
  /** Input stream for receiving binary data from the router */
  readable: ReadableStream<Uint8Array>;
  /** Output stream for sending binary data to the router */
  writable: WritableStream<Uint8Array>;
};

/**
 * MikroTik API client interface
 *
 * Provides high-level methods for executing commands and managing the connection.
 * Handles automatic request multiplexing via tags.
 */
export type Client = {
  /** Execute a command and await all replies */
  send: (command: Command) => Promise<Reply[]>;
  /** Close the connection gracefully */
  quit: () => Promise<void>;
};

type PendingRequest = {
  buffer: Reply[];
  resolvers: PromiseWithResolvers<Reply[]>;
};

/**
 * Creates a MikroTik API client with automatic request multiplexing
 *
 * Sets up encode/decode streams and manages request/reply correlation via
 * automatic tagging. Multiple commands can be sent concurrently without
 * waiting for previous commands to complete.
 *
 * @param options - Connection options with readable/writable streams
 * @returns Client with send() and quit() methods
 *
 * @example Basic client usage
 * ```ts ignore
 * import { createClient } from "@hertzg/routeros-api/client";
 *
 * // Create connection (example uses Deno, but works with any streams)
 * const conn = await Deno.connect({ hostname: "192.168.88.1", port: 8728 });
 *
 * // Create client
 * const client = createClient({
 *   readable: conn.readable,
 *   writable: conn.writable
 * });
 *
 * // Send command and get replies
 * const replies = await client.send({ command: "/interface/print" });
 *
 * // Close connection
 * await client.quit();
 * ```
 *
 * @example Concurrent commands
 * ```ts ignore
 * import { createClient } from "@hertzg/routeros-api/client";
 *
 * const conn = await Deno.connect({ hostname: "192.168.88.1", port: 8728 });
 * const client = createClient({
 *   readable: conn.readable,
 *   writable: conn.writable
 * });
 *
 * // Send multiple commands concurrently (no waiting)
 * const [interfaces, addresses, routes] = await Promise.all([
 *   client.send({ command: "/interface/print" }),
 *   client.send({ command: "/ip/address/print" }),
 *   client.send({ command: "/ip/route/print" })
 * ]);
 *
 * await client.quit();
 * ```
 */
export function createClient(options: ClientOptions): Client {
  const { readable, writable } = options;

  // Setup encode/decode streams
  const decodeStream = readable.pipeThrough(createApiDecodeStream());
  const encodeStream = createApiEncodeStream();

  // Connect streams (don't await, let it run)
  encodeStream.readable.pipeTo(writable);

  const reader = decodeStream.getReader();
  const writer = encodeStream.writable.getWriter();

  // Track pending requests by tag
  const pendingRequests = new Map<string, PendingRequest>();
  let readLoopRunning = true;
  let closed = false;

  // Background read loop
  const readLoop = (async () => {
    try {
      while (readLoopRunning) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }

        // Extract tag from reply
        const tag = "attributes" in value && value.attributes
          ? value.attributes[".tag"]
          : undefined;

        if (tag && pendingRequests.has(tag)) {
          const pending = pendingRequests.get(tag)!;

          // Check if command is complete
          if (isDone(value)) {
            pendingRequests.delete(tag);
            pending.resolvers.resolve(pending.buffer);
          } else if (isFatal(value)) {
            // Fatal error - close connection and reject all pending
            readLoopRunning = false;
            pendingRequests.delete(tag);
            pending.resolvers.reject(
              new Error(`Fatal error: ${value.message}`),
            );

            // Reject all other pending requests
            for (const [, otherPending] of pendingRequests.entries()) {
              otherPending.resolvers.reject(
                new Error(
                  `Connection closed due to fatal error: ${value.message}`,
                ),
              );
            }
            pendingRequests.clear();
            break;
          } else {
            pending.buffer.push(value);
          }
        }
      }
    } catch (error) {
      // Reject all pending requests on error
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      for (const [_, pending] of pendingRequests.entries()) {
        pending.resolvers.reject(new Error(`Read loop error: ${errorMessage}`));
      }
      pendingRequests.clear();
    }
  })();

  /**
   * Execute a command with automatic tagging
   */
  const send = async (command: Command): Promise<Reply[]> => {
    if (closed) {
      throw new Error("Client is closed");
    }

    // Generate unique tag
    const tag = crypto.randomUUID();

    // Create promise for this request
    const resolvers = Promise.withResolvers<Reply[]>();
    pendingRequests.set(tag, { buffer: [], resolvers });

    try {
      // Send command with tag (overwrite any existing tag)
      await writer.write({
        ...command,
        attributes: {
          ...(command.attributes || {}),
          ".tag": tag,
        },
      });

      // Wait for response
      return await resolvers.promise;
    } catch (error) {
      // Clean up on error
      pendingRequests.delete(tag);
      throw error;
    }
  };

  /**
   * Close the connection gracefully
   */
  const quit = async (): Promise<void> => {
    if (closed) {
      return;
    }

    closed = true;
    readLoopRunning = false;

    try {
      // Send quit command (without waiting for response)
      await writer.write({ command: "/quit" });
      await writer.close();
    } catch {
      // Ignore errors during close
    }

    // Wait for read loop to finish
    await readLoop;

    // Clean up any remaining pending requests
    for (const [_, pending] of pendingRequests.entries()) {
      pending.resolvers.reject(new Error("Connection closed"));
    }
    pendingRequests.clear();
  };

  return { send, quit };
}
