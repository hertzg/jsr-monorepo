/**
 * Baichuan messages: a header plus the bytes that follow it.
 *
 * {@link createMessage} builds a request with the header fields filled in,
 * and {@link decryptBody} turns a received body back into XML text.
 *
 * @example Build a subscribe request and read its header
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import {
 *   BAICHUAN_CHANNEL,
 *   BAICHUAN_CMD,
 *   createMessage,
 * } from "@hertzg/reolink-api/protocol/message";
 *
 * const message = createMessage({
 *   cmdId: BAICHUAN_CMD.SUBSCRIBE,
 *   channelId: BAICHUAN_CHANNEL.PUSH,
 *   messageId: 3,
 * });
 *
 * assertEquals(message.header, {
 *   cmdId: 31,
 *   bodyLength: 0,
 *   channelId: 251,
 *   messageId: 3,
 *   status: 0,
 *   messageClass: 0x1464,
 *   payloadOffset: 0,
 * });
 * ```
 *
 * @module
 */

import { aesCfbDecrypt, xorCipher } from "../encoding/cipher.ts";
import {
  BAICHUAN_MESSAGE_CLASS,
  type BaichuanHeader,
} from "../encoding/header.ts";

/**
 * Command ids (the header's `cmdId`) this package sends or reads.
 *
 * @example Check what a push is
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { BAICHUAN_CMD } from "@hertzg/reolink-api/protocol/message";
 *
 * assertEquals(BAICHUAN_CMD.ALARM_EVENT, 33);
 * ```
 */
export const BAICHUAN_CMD = {
  /** Nonce request and login, both on the host channel. */
  LOGIN: 1,
  /** Subscribe to alarm pushes. */
  SUBSCRIBE: 31,
  /** An alarm push: motion, doorbell, tamper or AI state. */
  ALARM_EVENT: 33,
  /** Ping, answered by the camera; keeps an idle connection open. */
  PING: 93,
} as const;

/**
 * Channel ids (the header's `channelId`) for requests that address the
 * device rather than one camera channel. Camera channels are `1`-`100`, the
 * channel number plus one.
 *
 * @example Address the device itself
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { BAICHUAN_CHANNEL } from "@hertzg/reolink-api/protocol/message";
 *
 * assertEquals(BAICHUAN_CHANNEL.HOST, 250);
 * ```
 */
export const BAICHUAN_CHANNEL = {
  /** The device itself: login, ping. */
  HOST: 250,
  /** The push channel: subscribe and alarm pushes. */
  PUSH: 251,
} as const;

/** A Baichuan message: header, body (usually XML) and binary payload. */
export type BaichuanMessage = {
  /** The decoded header. `bodyLength` covers `body` and `payload` together. */
  header: BaichuanHeader;
  /** The body as sent on the wire, still encrypted. */
  body: Uint8Array;
  /** Binary data after `header.payloadOffset`, empty for most messages. */
  payload: Uint8Array;
};

/** Fields for {@link createMessage}. */
export type CreateMessageOptions = {
  /** Command id, such as one of {@link BAICHUAN_CMD}. */
  cmdId: number;
  /** Channel id, such as one of {@link BAICHUAN_CHANNEL}. */
  channelId: number;
  /** Message id the reply will echo. */
  messageId: number;
  /** `LEGACY` only for the nonce request. Defaults to `MODERN_WITH_OFFSET`. */
  messageClass?:
    | typeof BAICHUAN_MESSAGE_CLASS.LEGACY
    | typeof BAICHUAN_MESSAGE_CLASS.MODERN_WITH_OFFSET;
  /** The already encrypted body. Defaults to empty. */
  body?: Uint8Array;
};

/**
 * Builds a request message, filling in the header from the options.
 *
 * Class `LEGACY` gets the `12 dc` encryption marker and the 20-byte header.
 * Class `MODERN_WITH_OFFSET` gets status `0` and a payload offset of `0`.
 *
 * @param options The command, ids, class and encrypted body.
 * @returns A message ready for the encode stream.
 *
 * @example Build the nonce request
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { BAICHUAN_MESSAGE_CLASS } from "@hertzg/reolink-api/encoding/header";
 * import {
 *   BAICHUAN_CHANNEL,
 *   BAICHUAN_CMD,
 *   createMessage,
 * } from "@hertzg/reolink-api/protocol/message";
 *
 * const message = createMessage({
 *   cmdId: BAICHUAN_CMD.LOGIN,
 *   channelId: BAICHUAN_CHANNEL.HOST,
 *   messageId: 1,
 *   messageClass: BAICHUAN_MESSAGE_CLASS.LEGACY,
 * });
 *
 * assertEquals(message.header.encryption, 0xdc12);
 * assertEquals(message.header.payloadOffset, undefined);
 * ```
 */
export function createMessage(options: CreateMessageOptions): BaichuanMessage {
  const {
    cmdId,
    channelId,
    messageId,
    messageClass = BAICHUAN_MESSAGE_CLASS.MODERN_WITH_OFFSET,
    body = new Uint8Array(0),
  } = options;
  const common = { cmdId, bodyLength: body.length, channelId, messageId };
  const header: BaichuanHeader = messageClass === BAICHUAN_MESSAGE_CLASS.LEGACY
    ? { ...common, messageClass, encryption: 0xdc12 }
    : { ...common, messageClass, status: 0, payloadOffset: 0 };
  return { header, body, payload: new Uint8Array(0) };
}

/**
 * Decrypts a received body into XML text.
 *
 * A 20-byte header names the cipher in the low byte of `encryption`: `0x01`
 * or `0x12` XOR, `0x02` or `0x03` AES, `0x00` none. A 24-byte header names
 * none, so AES (when a key is given), XOR and plain text are tried in that
 * order. The first result that starts with `<?xml` wins, which is how
 * reolink_aio decides too.
 *
 * @param message The received message.
 * @param aesKey The session key from login, if logged in.
 * @returns The XML text, or `""` for an empty body.
 * @throws {Error} When no cipher yields text starting with `<?xml`.
 *
 * @example Decrypt an XOR-encrypted nonce reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { xorCipher } from "@hertzg/reolink-api/encoding/cipher";
 * import { decryptBody } from "@hertzg/reolink-api/protocol/message";
 *
 * const xml = "<?xml version=\"1.0\" ?><body><nonce>abc</nonce></body>";
 * const body = xorCipher(new TextEncoder().encode(xml), 250);
 *
 * const text = decryptBody({
 *   header: {
 *     cmdId: 1,
 *     bodyLength: body.length,
 *     channelId: 250,
 *     messageId: 1,
 *     encryption: 0xdd01,
 *     messageClass: 0x1466,
 *   },
 *   body,
 *   payload: new Uint8Array(0),
 * });
 *
 * assertEquals(text, xml);
 * ```
 */
export function decryptBody(
  message: BaichuanMessage,
  aesKey?: Uint8Array,
): string {
  const { header, body } = message;
  if (body.length === 0) {
    return "";
  }

  const ciphers = {
    aes: (data: Uint8Array) =>
      aesKey === undefined ? undefined : aesCfbDecrypt(aesKey, data),
    xor: (data: Uint8Array) => xorCipher(data, header.channelId),
    plain: (data: Uint8Array) => data,
  };
  const markers: Record<number, keyof typeof ciphers> = {
    0x01: "xor",
    0x12: "xor",
    0x02: "aes",
    0x03: "aes",
  };
  const first: keyof typeof ciphers = header.encryption === undefined
    ? "aes"
    : markers[header.encryption & 0xff] ?? "plain";

  const decoder = new TextDecoder();
  for (const name of new Set([first, "aes", "xor", "plain"] as const)) {
    const decrypted = ciphers[name](body);
    if (decrypted === undefined) {
      continue;
    }
    const text = decoder.decode(decrypted);
    if (text.startsWith("<?xml")) {
      return text;
    }
  }
  throw new Error(
    `Baichuan body of cmd ${header.cmdId} did not decrypt to XML`,
  );
}
