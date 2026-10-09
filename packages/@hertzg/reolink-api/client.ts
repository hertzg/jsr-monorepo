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

import { concat } from "@std/bytes";
import { aesCfbEncrypt, xorCipher } from "./encoding/cipher.ts";
import { BAICHUAN_MESSAGE_CLASS } from "./encoding/header.ts";
import {
  type Command,
  type CommandBody,
  decodeCommandBody,
  encodeCommandBody,
} from "./protocol/command.ts";
import { PUSHES, type Pushes } from "./protocol/commands.ts";
import { type AlarmEvent, parseAlarmEvents } from "./protocol/event.ts";
import { loginCredentials, loginXml, parseNonce } from "./protocol/login.ts";
import {
  BAICHUAN_CHANNEL,
  BAICHUAN_CMD,
  type BaichuanMessage,
  createMessage,
  type CreateMessageOptions,
  decryptBody,
  decryptPayload,
  extensionXml,
} from "./protocol/message.ts";
import { parsePrivacyMode, privacyModeXml } from "./protocol/privacy.ts";
import {
  parsePtzPosition,
  parsePtzPresets,
  type PtzCommand,
  ptzControlXml,
  type PtzPosition,
  type PtzPreset,
  ptzPresetXml,
} from "./protocol/ptz.ts";
import { sirenXml } from "./protocol/siren.ts";
import { parseSnapshotSize, snapshotXml } from "./protocol/snapshot.ts";
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

/** Which camera a request is about. */
export type ChannelOptions = {
  /** The zero-based channel number. A standalone camera is `0`, the default. */
  channel?: number;
};

/**
 * Options for {@link Client.call}.
 *
 * @template C The command being called.
 */
export type CallOptions<C extends Command> = {
  /** The zero-based channel to address. Leave it out to address the device. */
  channel?: number;
  /** The parameters to send, by element name. */
  body?: CommandBody<C>;
};

/**
 * The reply to {@link Client.call}.
 *
 * @template C The command that was called.
 */
export type CallReply<C extends Command> = {
  /** The reply's parameters, by element name. */
  body: CommandBody<C>;
  /** Binary data after the XML, decrypted; empty for most commands. */
  payload: Uint8Array;
};

/**
 * A message the camera sent unasked, from {@link Client.pushes}.
 *
 * Narrow on `name`: a known push carries its decoded `body`, an unknown one
 * (`name: undefined`) its decrypted `xml`.
 */
export type Push =
  | {
    [K in keyof Pushes]: {
      /** The {@link PUSHES} key. */
      name: K;
      /** The command id. */
      id: number;
      /** The decoded parameters. */
      body: CommandBody<Pushes[K]>;
    };
  }[keyof Pushes]
  | {
    /** Not in the {@link PUSHES} table. */
    name: undefined;
    /** The command id. */
    id: number;
    /** The decrypted body. */
    xml: string;
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
   * Plays the siren a number of times, about 5 seconds each. Needs a login.
   *
   * @throws {Error} When the camera rejects the request.
   */
  playSiren: (options?: ChannelOptions & { times?: number }) => Promise<void>;
  /**
   * Starts the siren until {@link Client.stopSiren}. Needs a login.
   *
   * @throws {Error} When the camera rejects the request.
   */
  startSiren: (options?: ChannelOptions) => Promise<void>;
  /**
   * Stops the siren, whether started or played a number of times. Needs a
   * login.
   *
   * @throws {Error} When the camera rejects the request.
   */
  stopSiren: (options?: ChannelOptions) => Promise<void>;
  /**
   * Reads whether privacy mode (sleep) is on. Needs a login.
   *
   * @throws {Error} When the camera rejects the request.
   */
  privacyMode: (options?: ChannelOptions) => Promise<boolean>;
  /**
   * Turns privacy mode (sleep) on or off. Needs a login.
   *
   * @throws {Error} When the camera rejects the request.
   */
  setPrivacyMode: (
    options: ChannelOptions & { enabled: boolean },
  ) => Promise<void>;
  /**
   * Takes a JPEG snapshot of the `main` (default) or `sub` stream. Needs a
   * login.
   *
   * @throws {Error} When the camera rejects the request, or when the image
   *   that arrives is not the size the camera announced.
   */
  snapshot: (
    options?: ChannelOptions & { stream?: "main" | "sub" },
  ) => Promise<Uint8Array>;
  /**
   * Starts a PTZ move or zoom, which keeps going until `PTZ_COMMAND.STOP`.
   * Needs a login.
   *
   * @throws {Error} When the camera rejects the request.
   */
  ptz: (
    options: ChannelOptions & { command: PtzCommand; speed?: number },
  ) => Promise<void>;
  /**
   * Lists the saved PTZ presets. Needs a login.
   *
   * @throws {Error} When the camera rejects the request.
   */
  ptzPresets: (options?: ChannelOptions) => Promise<PtzPreset[]>;
  /**
   * Moves to a saved PTZ preset by its id. Needs a login.
   *
   * @throws {Error} When the camera rejects the request.
   */
  ptzGoToPreset: (options: ChannelOptions & { id: number }) => Promise<void>;
  /**
   * Reads where the camera points now. Poll it to tell when a move has
   * finished on cameras that push no PTZ state. Needs a login.
   *
   * @throws {Error} When the camera rejects the request.
   */
  ptzPosition: (options?: ChannelOptions) => Promise<PtzPosition>;
  /**
   * Sends any {@link Command} and reads its reply. Needs a login.
   *
   * With `channel`, the request addresses that channel; without it, the
   * device itself. `body` holds the parameters to send, by element name;
   * leave it out for commands that only read.
   *
   * @throws {Error} When the camera rejects the request, or when the reply
   *   misses a field the command's parameter codecs require.
   */
  call: <C extends Command>(
    command: C,
    options?: CallOptions<C>,
  ) => Promise<CallReply<C>>;
  /**
   * Returns every message the camera sends unasked, alarm events included,
   * decoded by the {@link PUSHES} table when its id is known and as raw XML
   * otherwise. The camera pushes only after {@link Client.subscribe}.
   *
   * A push the table fails to read errors this stream only; the connection
   * and the alarm event stream carry on. The stream ends with the
   * connection.
   *
   * @throws {Error} When a push stream is already open, or the client has
   *   ended.
   */
  pushes: () => ReadableStream<Push>;
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
  const pending = new Map<string, Pending>();
  const downloads = new Map<string, Download>();
  const sirenPlayingUntil = new Map<number, number>();

  let messageId = 0;
  let aesKey: Uint8Array | undefined;
  let lastReceivedAt = Date.now();
  let subscription: Subscription | undefined;
  let ended: unknown;

  const keyOf = (cmdId: number, channelId: number, id: number) =>
    `${cmdId}/${channelId}/${id}`;

  let pushes: ReadableStreamDefaultController<Push> | undefined;

  const unsubscribe = () => {
    clearTimeout(subscription?.keepAlive);
    subscription = undefined;
  };

  const shutdown = (reason: unknown, events: "close" | "error") => {
    ended ??= reason;
    for (const { reply, download } of pending.values()) {
      reply.reject(reason);
      download?.done.reject(reason);
    }
    pending.clear();
    for (const download of downloads.values()) {
      download.done.reject(reason);
    }
    downloads.clear();
    if (events === "error") {
      subscription?.events.error(reason);
      pushes?.error(reason);
    } else {
      subscription?.events.close();
      pushes?.close();
    }
    pushes = undefined;
    unsubscribe();
  };

  const fail = (error: unknown) => shutdown(error, "error");

  const onMessage = (message: BaichuanMessage) => {
    const { cmdId, channelId, messageId, status } = message.header;
    const key = keyOf(cmdId, channelId, messageId);
    const request = pending.get(key);
    if (request !== undefined) {
      pending.delete(key);
      if (status !== undefined && ![200, 201, 300].includes(status)) {
        const error = new Error(
          `Baichuan cmd ${cmdId} failed with status ${status}`,
        );
        request.reply.reject(error);
        request.download?.done.reject(error);
      } else {
        if (request.download !== undefined) {
          downloads.set(key, request.download);
        }
        request.reply.resolve(message);
      }
      return;
    }
    const download = downloads.get(key);
    if (download !== undefined) {
      try {
        if (message.payload.length === 0) {
          downloads.delete(key);
          download.done.resolve(concat(download.chunks));
        } else {
          download.chunks.push(decryptPayload(message, download.aesKey));
        }
      } catch (error) {
        downloads.delete(key);
        download.done.reject(error);
      }
      return;
    }
    if (cmdId === BAICHUAN_CMD.ALARM_EVENT && subscription !== undefined) {
      subscription.sawEvent = true;
      for (const event of parseAlarmEvents(decryptBody(message, aesKey))) {
        subscription.events.enqueue(event);
      }
    }
    if (pushes !== undefined) {
      // A push this table reads wrongly ends only the push stream, not the
      // connection the alarm events also ride on.
      try {
        pushes.enqueue(decodePush(message, aesKey));
      } catch (error) {
        pushes.error(error);
        pushes = undefined;
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
    download?: Download,
  ): Promise<BaichuanMessage> => {
    if (ended !== undefined) {
      throw ended;
    }
    messageId = (messageId + 1) % 0x1000000;
    const key = keyOf(request.cmdId, request.channelId, messageId);
    const reply = Promise.withResolvers<BaichuanMessage>();
    // shutdown() can reject this while the write below is still queued.
    reply.promise.catch(() => {});
    pending.set(key, { reply, download });
    try {
      await writer.write(createMessage({ ...request, messageId }));
    } catch (error) {
      pending.delete(key);
      download?.done.reject(error);
      throw error;
    }
    return reply.promise;
  };

  /**
   * Sends an AES-encrypted request about one channel. With `image`, the
   * payload that follows the reply is collected into it.
   */
  /** Sends an AES request to `channel`, or to the host when it is undefined. */
  const request = async (
    cmdId: number,
    channel: number | undefined,
    xml?: string,
    image?: PromiseWithResolvers<Uint8Array>,
  ): Promise<BaichuanMessage> => {
    const key = aesKey;
    if (key === undefined) {
      throw new Error("Baichuan client is not logged in");
    }
    const encrypt = (text: string) =>
      aesCfbEncrypt(key, new TextEncoder().encode(text));
    image?.promise.catch(() => {});
    return await send(
      {
        cmdId,
        channelId: channel === undefined ? BAICHUAN_CHANNEL.HOST : channel + 1,
        extension: channel === undefined
          ? undefined
          : encrypt(extensionXml(channel)),
        body: xml === undefined || xml === "" ? undefined : encrypt(xml),
      },
      image === undefined
        ? undefined
        : { aesKey: key, chunks: [], done: image },
    );
  };

  const siren = (channel: number, play: { times: number } | { on: boolean }) =>
    request(BAICHUAN_CMD.SIREN, channel, sirenXml({ channel, ...play }));

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
          ? { cmdId: BAICHUAN_CMD.PING, channelId: BAICHUAN_CHANNEL.HOST }
          : { cmdId: BAICHUAN_CMD.SUBSCRIBE, channelId: BAICHUAN_CHANNEL.PUSH },
      ).catch(() => {});
      current.keepAlive = setTimeout(tick, interval);
    };
    current.keepAlive = setTimeout(tick, interval);
  };

  return {
    login: async ({ username, password }) => {
      const nonceReply = await send({
        cmdId: BAICHUAN_CMD.LOGIN,
        channelId: BAICHUAN_CHANNEL.HOST,
        messageClass: BAICHUAN_MESSAGE_CLASS.LEGACY,
      });
      const credentials = loginCredentials({
        username,
        password,
        nonce: parseNonce(decryptBody(nonceReply)),
      });
      await send({
        cmdId: BAICHUAN_CMD.LOGIN,
        channelId: BAICHUAN_CHANNEL.HOST,
        body: xorCipher(
          new TextEncoder().encode(loginXml(credentials)),
          BAICHUAN_CHANNEL.HOST,
        ),
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
        await send({
          cmdId: BAICHUAN_CMD.SUBSCRIBE,
          channelId: BAICHUAN_CHANNEL.PUSH,
        });
      } catch (error) {
        unsubscribe();
        throw error;
      }
      return stream;
    },

    playSiren: async ({ channel = 0, times = 1 } = {}) => {
      await siren(channel, { times });
      sirenPlayingUntil.set(channel, Date.now() + times * 5_000);
    },

    startSiren: async ({ channel = 0 } = {}) => {
      await siren(channel, { on: true });
      sirenPlayingUntil.delete(channel);
    },

    stopSiren: async ({ channel = 0 } = {}) => {
      // Firmware ignores a stop during a timed play unless manual play
      // started first, as reolink_aio found.
      if (Date.now() < (sirenPlayingUntil.get(channel) ?? 0)) {
        await siren(channel, { on: true }).catch(() => {});
      }
      sirenPlayingUntil.delete(channel);
      await siren(channel, { on: false });
    },

    privacyMode: async ({ channel = 0 } = {}) =>
      parsePrivacyMode(
        decryptBody(
          await request(BAICHUAN_CMD.PRIVACY_MODE, channel),
          aesKey,
        ),
      ),

    setPrivacyMode: async ({ channel = 0, enabled }) => {
      await request(
        BAICHUAN_CMD.SET_PRIVACY_MODE,
        channel,
        privacyModeXml(enabled),
      );
    },

    snapshot: async ({ channel = 0, stream = "main" } = {}) => {
      const image = Promise.withResolvers<Uint8Array>();
      const reply = await request(
        BAICHUAN_CMD.SNAPSHOT,
        channel,
        snapshotXml({ channel, stream }),
        image,
      );
      const size = parseSnapshotSize(decryptBody(reply, aesKey));
      const bytes = await image.promise;
      if (bytes.length !== size) {
        throw new Error(
          `Baichuan snapshot announced ${size} bytes but sent ${bytes.length}`,
        );
      }
      return bytes;
    },

    ptz: async ({ channel = 0, command, speed }) => {
      await request(
        BAICHUAN_CMD.PTZ_CONTROL,
        channel,
        ptzControlXml({ channel, command, speed }),
      );
    },

    ptzPresets: async ({ channel = 0 } = {}) =>
      parsePtzPresets(
        decryptBody(await request(BAICHUAN_CMD.PTZ_PRESETS, channel), aesKey),
      ),

    ptzGoToPreset: async ({ channel = 0, id }) => {
      await request(
        BAICHUAN_CMD.PTZ_PRESET,
        channel,
        ptzPresetXml({ channel, id }),
      );
    },

    ptzPosition: async ({ channel = 0 } = {}) =>
      parsePtzPosition(
        decryptBody(await request(BAICHUAN_CMD.PTZ_POSITION, channel), aesKey),
      ),

    call: async (command, { channel, body = {} } = {}) => {
      const reply = await request(
        command.id,
        channel,
        encodeCommandBody(command, body),
      );
      return {
        body: decodeCommandBody(command, decryptBody(reply, aesKey)),
        payload: reply.payload.length === 0
          ? reply.payload
          : decryptPayload(reply, aesKey!),
      };
    },

    pushes: () => {
      if (pushes !== undefined) {
        throw new Error("Baichuan client already has a push stream");
      }
      if (ended !== undefined) {
        throw ended;
      }
      return new ReadableStream<Push>({
        start: (controller) => {
          pushes = controller;
        },
        cancel: () => {
          pushes = undefined;
        },
      });
    },

    close: async () => {
      shutdown(new Error("Baichuan client is closed"), "close");
      await writer.close().catch(() => {});
    },
  };
}

/** Reads a push: by the {@link PUSHES} table when its id is known, raw otherwise. */
function decodePush(message: BaichuanMessage, aesKey?: Uint8Array): Push {
  const { cmdId } = message.header;
  const xml = decryptBody(message, aesKey);
  for (const [name, push] of Object.entries(PUSHES)) {
    if (push.id === cmdId) {
      return {
        name,
        id: cmdId,
        body: decodeCommandBody(push, xml),
      } as Push;
    }
  }
  return { name: undefined, id: cmdId, xml };
}

/** A request waiting for its reply. */
type Pending = {
  reply: PromiseWithResolvers<BaichuanMessage>;
  /** Set when the reply is followed by payload messages to collect. */
  download?: Download;
};

/** Payload chunks arriving after a reply, such as a snapshot. */
type Download = {
  aesKey: Uint8Array;
  chunks: Uint8Array[];
  done: PromiseWithResolvers<Uint8Array>;
};

/** The open event stream and the keepalive that guards it. */
type Subscription = {
  events: ReadableStreamDefaultController<AlarmEvent>;
  sawEvent: boolean;
  keepAlive?: ReturnType<typeof setTimeout>;
};
