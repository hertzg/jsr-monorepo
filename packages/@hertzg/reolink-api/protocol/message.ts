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

import { isElement, isText, parse, type XmlElement } from "@std/xml";
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
  /** Move, zoom or stop a PTZ camera. */
  PTZ_CONTROL: 18,
  /** Move a PTZ camera to a saved preset. */
  PTZ_PRESET: 19,
  /** Take a JPEG snapshot, streamed back as payload. */
  SNAPSHOT: 109,
  /** List the saved PTZ presets. */
  PTZ_PRESETS: 190,
  /** Read the current PTZ pan and tilt position. */
  PTZ_POSITION: 433,
  /** Play or stop the siren. */
  SIREN: 263,
  /** Read the privacy mode (sleep) state. */
  PRIVACY_MODE: 574,
  /** Turn the privacy mode (sleep) on or off. */
  SET_PRIVACY_MODE: 575,
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

/**
 * A Baichuan message: a header and the bytes after it, split at
 * `header.payloadOffset`.
 *
 * In a reply the split separates the XML body from binary data such as a
 * snapshot. In a request it separates the channel extension from the
 * command's XML. Each part is encrypted on its own.
 */
export type BaichuanMessage = {
  /** The decoded header. `bodyLength` covers `body` and `payload` together. */
  header: BaichuanHeader;
  /** Bytes before `payloadOffset`, as sent on the wire, still encrypted. */
  body: Uint8Array;
  /** Bytes after `payloadOffset`, empty for most messages. */
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
  /**
   * The already encrypted channel extension, from {@link extensionXml}. It
   * goes before `body`, and `payloadOffset` points past it.
   */
  extension?: Uint8Array;
  /** The already encrypted body. Defaults to empty. */
  body?: Uint8Array;
};

/**
 * Builds a request message, filling in the header from the options.
 *
 * Class `LEGACY` gets the `12 dc` encryption marker and the 20-byte header.
 * Class `MODERN_WITH_OFFSET` gets status `0` and a payload offset of the
 * extension's length, `0` without one.
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
    extension,
    body = new Uint8Array(0),
  } = options;
  const payloadOffset = extension?.length ?? 0;
  const common = {
    cmdId,
    bodyLength: payloadOffset + body.length,
    channelId,
    messageId,
  };
  const header: BaichuanHeader = messageClass === BAICHUAN_MESSAGE_CLASS.LEGACY
    ? { ...common, messageClass, encryption: 0xdc12 }
    : { ...common, messageClass, status: 0, payloadOffset };
  return extension === undefined
    ? { header, body, payload: new Uint8Array(0) }
    : { header, body: extension, payload: body };
}

/**
 * Builds the extension XML that addresses a request to one camera channel.
 *
 * Requests about a channel, such as a snapshot or PTZ move, carry it in front
 * of their body, see the `extension` option of {@link createMessage}.
 *
 * @param channel The zero-based channel number.
 * @returns The extension XML, ready to be encrypted.
 *
 * @example Address channel 0
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { extensionXml } from "@hertzg/reolink-api/protocol/message";
 *
 * assertStringIncludes(extensionXml(0), "<channelId>0</channelId>");
 * ```
 */
export function extensionXml(channel: number): string {
  return '<?xml version="1.0" encoding="UTF-8" ?>\n' +
    '<Extension version="1.1">\n' +
    `<channelId>${channel}</channelId>\n` +
    "</Extension>\n";
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

/**
 * Decrypts the binary payload of a received message, such as a snapshot
 * chunk.
 *
 * When the body names an `<encryptLen>`, that many leading payload bytes are
 * AES-encrypted and the rest is plain. Without one the payload is plain.
 *
 * @param message The received message.
 * @param aesKey The session key from login.
 * @returns The plain payload.
 *
 * @example Read a plain payload
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { decryptPayload } from "@hertzg/reolink-api/protocol/message";
 *
 * const payload = decryptPayload({
 *   header: {
 *     cmdId: 109,
 *     bodyLength: 3,
 *     channelId: 1,
 *     messageId: 7,
 *     status: 200,
 *     messageClass: 0x1464,
 *     payloadOffset: 0,
 *   },
 *   body: new Uint8Array(0),
 *   payload: Uint8Array.of(0xff, 0xd8, 0xff),
 * }, new TextEncoder().encode("08822D7143979103"));
 *
 * assertEquals(payload, Uint8Array.of(0xff, 0xd8, 0xff));
 * ```
 */
export function decryptPayload(
  message: BaichuanMessage,
  aesKey: Uint8Array,
): Uint8Array {
  const { payload } = message;
  const xml = decryptBody(message, aesKey);
  const encrypted = xml === "" ? undefined : findElement(parse(xml).root);
  if (encrypted === undefined) {
    return payload;
  }
  const length = Number(
    encrypted.children.filter(isText).map((node) => node.text).join(""),
  );
  const out = payload.slice();
  out.set(aesCfbDecrypt(aesKey, payload.subarray(0, length)));
  return out;
}

function findElement(element: XmlElement): XmlElement | undefined {
  if (element.name.local.toLowerCase() === "encryptlen") {
    return element;
  }
  for (const child of element.children.filter(isElement)) {
    const found = findElement(child);
    if (found !== undefined) {
      return found;
    }
  }
  return undefined;
}
