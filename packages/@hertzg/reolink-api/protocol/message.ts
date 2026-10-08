/**
 * Baichuan messages: a header plus the bytes that follow it.
 *
 * {@link createMessage} builds a request with the header fields filled in,
 * and {@link decryptBody} turns a received body back into XML text.
 *
 * @example Build a subscribe request and read its header
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { createMessage } from "@hertzg/reolink-api/protocol/message";
 *
 * const message = createMessage({ cmdId: 31, channelId: 251, messageId: 3 });
 *
 * assertEquals(message.header, {
 *   cmdId: 31,
 *   bodyLength: 0,
 *   channelId: 251,
 *   messageId: 3,
 *   code: 0,
 *   messageClass: 0x1464,
 *   payloadOffset: 0,
 * });
 * ```
 *
 * @module
 */

import { aesCfbDecrypt, xorCipher } from "../encoding/cipher.ts";
import { type BaichuanHeader, headerLength } from "../encoding/header.ts";

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
  /** Command id. */
  cmdId: number;
  /** Channel id: `250` for the host, `251` for push. */
  channelId: number;
  /** Message id the reply will echo. */
  messageId: number;
  /** `0x1465` only for the nonce request, `0x1464` otherwise. Defaults to `0x1464`. */
  messageClass?: 0x1464 | 0x1465;
  /** The already encrypted body. Defaults to empty. */
  body?: Uint8Array;
};

/**
 * Builds a request message, filling in the header from the options.
 *
 * Class `0x1465` gets the `12 dc` encryption marker and the 20-byte header.
 * Class `0x1464` gets status `0` and a payload offset of `0`.
 *
 * @param options The command, ids, class and encrypted body.
 * @returns A message ready for the encode stream.
 *
 * @example Build the nonce request
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { createMessage } from "@hertzg/reolink-api/protocol/message";
 *
 * const message = createMessage({
 *   cmdId: 1,
 *   channelId: 250,
 *   messageId: 1,
 *   messageClass: 0x1465,
 * });
 *
 * assertEquals(message.header.code, 0xdc12);
 * assertEquals(message.header.payloadOffset, undefined);
 * ```
 */
export function createMessage(options: CreateMessageOptions): BaichuanMessage {
  const {
    cmdId,
    channelId,
    messageId,
    messageClass = 0x1464,
    body = new Uint8Array(0),
  } = options;
  const header: BaichuanHeader = messageClass === 0x1465
    ? {
      cmdId,
      bodyLength: body.length,
      channelId,
      messageId,
      code: 0xdc12,
      messageClass,
    }
    : {
      cmdId,
      bodyLength: body.length,
      channelId,
      messageId,
      code: 0,
      messageClass,
      payloadOffset: 0,
    };
  return { header, body, payload: new Uint8Array(0) };
}

/**
 * Decrypts a received body into XML text.
 *
 * A 20-byte header names the cipher in its low code byte: `0x01` or `0x12`
 * XOR, `0x02` or `0x03` AES, `0x00` none. A 24-byte header names none, so
 * AES (when a key is given), XOR and plain text are tried in that order. The
 * first result that starts with `<?xml` wins, which is how reolink_aio
 * decides too.
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
 *     code: 0xdd01,
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
  const marker = header.code & 0xff;
  const order: (keyof typeof ciphers)[] = headerLength(header.messageClass) ===
      24
    ? ["aes", "xor", "plain"]
    : marker === 0x01 || marker === 0x12
    ? ["xor", "aes", "plain"]
    : marker === 0x02 || marker === 0x03
    ? ["aes", "xor", "plain"]
    : ["plain", "aes", "xor"];

  const decoder = new TextDecoder();
  for (const name of order) {
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
