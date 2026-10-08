/**
 * Reolink Baichuan client: login, then a stream of alarm events.
 *
 * The client takes the readable and writable halves of a TCP connection to
 * the camera's Baichuan port (9000 by default). It never opens, reconnects or
 * closes the socket itself.
 *
 * @example Stream doorbell and motion events
 * ```ts ignore
 * import { createClient } from "@hertzg/reolink-api/client";
 *
 * const conn = await Deno.connect({ hostname: "192.168.1.10", port: 9000 });
 * const client = createClient({ readable: conn.readable, writable: conn.writable });
 *
 * await client.login({ username: "admin", password: "secret" });
 * const events = await client.subscribe();
 *
 * for await (const event of events) {
 *   console.log(event.channel, event.visitor, event.motion, event.ai);
 * }
 * ```
 *
 * @module
 */

import { xorCipher } from "./encoding/cipher.ts";
import { headerLength } from "./encoding/header.ts";
import { type AlarmEvent, parseAlarmEvents } from "./protocol/event.ts";
import { loginCredentials, loginXml, parseNonce } from "./protocol/login.ts";
import {
  type BaichuanMessage,
  createMessage,
  type CreateMessageOptions,
  decryptBody,
} from "./protocol/message.ts";
import { createBaichuanDecodeStream } from "./streams/decode.ts";
import { createBaichuanEncodeStream } from "./streams/encode.ts";

/** The two halves of a connection to the camera's Baichuan port. */
export type ClientOptions = {
  /** Bytes from the camera. */
  readable: ReadableStream<Uint8Array>;
  /** Bytes to the camera. */
  writable: WritableStream<Uint8Array>;
};

/** Camera credentials for {@link Client.login}. */
export type LoginOptions = {
  /** The camera user name. */
  username: string;
  /** The camera password. */
  password: string;
};

/** Options for {@link Client.subscribe}. */
export type SubscribeOptions = {
  /**
   * How long the connection may stay silent before the client pings the
   * camera, in milliseconds. If a second interval passes with nothing from
   * the camera, the event stream errors. Defaults to `30_000`.
   */
  keepAliveMs?: number;
};

/** A Baichuan client bound to one connection. */
export type Client = {
  /**
   * Logs in with the modern (nonce + MD5) login and keeps the AES session key.
   *
   * @throws {Error} When the camera answers with a status other than 200,
   *   such as 401 for wrong credentials.
   */
  login: (options: LoginOptions) => Promise<void>;
  /**
   * Subscribes to alarm pushes (cmd 31) and returns them as a stream.
   *
   * While the stream is open the client keeps the connection alive: after
   * `keepAliveMs` of silence it sends cmd 93 (or repeats cmd 31 if no event
   * has arrived yet), and errors the stream if that gets no answer either.
   * The stream ends when the connection ends.
   *
   * @throws {Error} When already subscribed, or when the camera rejects the
   *   subscription.
   */
  subscribe: (
    options?: SubscribeOptions,
  ) => Promise<ReadableStream<AlarmEvent>>;
  /**
   * Stops the keepalive, ends the event stream and closes the writable. The
   * caller still closes the socket.
   */
  close: () => Promise<void>;
};

/**
 * Creates a Baichuan client over the given connection streams.
 *
 * Requests are matched to replies by command, channel and message id, so
 * calls may overlap. Messages that match no request are pushes: cmd 33 pushes
 * feed the event stream, all others are dropped.
 *
 * @param options The connection's readable and writable streams.
 * @returns A {@link Client}.
 *
 * @example Log in and subscribe
 * ```ts ignore
 * import { createClient } from "@hertzg/reolink-api/client";
 *
 * const conn = await Deno.connect({ hostname: "192.168.1.10", port: 9000 });
 * const client = createClient({ readable: conn.readable, writable: conn.writable });
 *
 * await client.login({ username: "admin", password: "secret" });
 * const events = await client.subscribe({ keepAliveMs: 20_000 });
 *
 * for await (const event of events) {
 *   if (event.visitor) {
 *     console.log("doorbell active on channel", event.channel);
 *   }
 * }
 *
 * await client.close();
 * conn.close();
 * ```
 */
export function createClient(options: ClientOptions): Client {
  const encoder = createBaichuanEncodeStream();
  const writer = encoder.writable.getWriter();
  const pending = new Map<string, PromiseWithResolvers<BaichuanMessage>>();

  let messageId = 0;
  let aesKey: Uint8Array | undefined;
  let lastReceivedAt = Date.now();
  let subscription: Subscription | undefined;
  let ended: unknown;

  const keyOf = (cmdId: number, channelId: number, id: number) =>
    `${cmdId}/${channelId}/${id}`;

  const unsubscribe = () => {
    clearTimeout(subscription?.keepAlive);
    subscription = undefined;
  };

  const shutdown = (reason: unknown, events: "close" | "error") => {
    ended ??= reason;
    for (const request of pending.values()) {
      request.reject(reason);
    }
    pending.clear();
    if (events === "error") {
      subscription?.events.error(reason);
    } else {
      subscription?.events.close();
    }
    unsubscribe();
  };

  const fail = (error: unknown) => shutdown(error, "error");

  const onMessage = (message: BaichuanMessage) => {
    const { cmdId, channelId, messageId, code, messageClass } = message.header;
    const key = keyOf(cmdId, channelId, messageId);
    const request = pending.get(key);
    if (request !== undefined) {
      pending.delete(key);
      if (
        headerLength(messageClass) === 24 && ![200, 201, 300].includes(code)
      ) {
        request.reject(
          new Error(`Baichuan cmd ${cmdId} failed with status ${code}`),
        );
      } else {
        request.resolve(message);
      }
      return;
    }
    if (cmdId === 33 && subscription !== undefined) {
      subscription.sawEvent = true;
      for (const event of parseAlarmEvents(decryptBody(message, aesKey))) {
        subscription.events.enqueue(event);
      }
    }
  };

  encoder.readable.pipeTo(options.writable).catch(fail);

  (async () => {
    const messages = options.readable.pipeThrough(createBaichuanDecodeStream());
    // The socket is the caller's: a message that throws must not cancel it.
    for await (const message of messages.values({ preventCancel: true })) {
      lastReceivedAt = Date.now();
      onMessage(message);
    }
    shutdown(new Error("Baichuan connection closed"), "close");
  })().catch(fail);

  const send = async (
    request: Omit<CreateMessageOptions, "messageId">,
  ): Promise<BaichuanMessage> => {
    if (ended !== undefined) {
      throw ended;
    }
    messageId = (messageId + 1) % 0x1000000;
    const key = keyOf(request.cmdId, request.channelId, messageId);
    const reply = Promise.withResolvers<BaichuanMessage>();
    // shutdown() can reject this while the write below is still queued.
    reply.promise.catch(() => {});
    pending.set(key, reply);
    try {
      await writer.write(createMessage({ ...request, messageId }));
    } catch (error) {
      pending.delete(key);
      throw error;
    }
    return reply.promise;
  };

  const keepAlive = (current: Subscription, interval: number) => {
    let pingSentAt: number | undefined;
    const tick = () => {
      const idle = Date.now() - lastReceivedAt;
      if (idle < interval) {
        current.keepAlive = setTimeout(tick, interval - idle);
        return;
      }
      if (pingSentAt !== undefined && lastReceivedAt < pingSentAt) {
        fail(
          new Error(`Baichuan camera silent for ${idle} ms despite keepalive`),
        );
        return;
      }
      pingSentAt = Date.now();
      send(
        current.sawEvent
          ? { cmdId: 93, channelId: 250 }
          : { cmdId: 31, channelId: 251 },
      ).catch(() => {});
      current.keepAlive = setTimeout(tick, interval);
    };
    current.keepAlive = setTimeout(tick, interval);
  };

  return {
    login: async ({ username, password }) => {
      const nonceReply = await send({
        cmdId: 1,
        channelId: 250,
        messageClass: 0x1465,
      });
      const credentials = loginCredentials({
        username,
        password,
        nonce: parseNonce(decryptBody(nonceReply)),
      });
      await send({
        cmdId: 1,
        channelId: 250,
        body: xorCipher(new TextEncoder().encode(loginXml(credentials)), 250),
      });
      aesKey = credentials.aesKey;
    },

    subscribe: async ({ keepAliveMs = 30_000 } = {}) => {
      if (subscription !== undefined) {
        throw new Error("Baichuan client is already subscribed");
      }
      const stream = new ReadableStream<AlarmEvent>({
        start: (events) => {
          subscription = { events, sawEvent: false };
          keepAlive(subscription, keepAliveMs);
        },
        cancel: unsubscribe,
      });
      try {
        await send({ cmdId: 31, channelId: 251 });
      } catch (error) {
        unsubscribe();
        throw error;
      }
      return stream;
    },

    close: async () => {
      shutdown(new Error("Baichuan client is closed"), "close");
      await writer.close().catch(() => {});
    },
  };
}

/** The open event stream and the keepalive that guards it. */
type Subscription = {
  events: ReadableStreamDefaultController<AlarmEvent>;
  sawEvent: boolean;
  keepAlive?: ReturnType<typeof setTimeout>;
};
