/**
 * Baichuan message header coder.
 *
 * Every Baichuan message starts with a little-endian header. Its length
 * depends on the message class: the two `MODERN_WITH_OFFSET` classes carry a
 * trailing payload offset and are 24 bytes, every other class is 20 bytes.
 *
 * ```
 * offset  size  field
 * 0       4     magic f0 de bc 0a
 * 4       4     cmdId          u32le
 * 8       4     bodyLength     u32le
 * 12      1     channelId      u8     0/251 push, 1-100 channel + 1, 250 host
 * 13      3     messageId      u24le
 * 16      2     status         u16le  24-byte classes: status code
 *               encryption            20-byte classes: encryption marker
 * 18      2     messageClass   u16be
 * 20      4     payloadOffset  u32le  24-byte classes only
 * ```
 *
 * @example Encode and decode the nonce request header
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { decode, encode } from "@hertzg/binstruct";
 * import {
 *   BAICHUAN_MESSAGE_CLASS,
 *   baichuanHeader,
 * } from "@hertzg/reolink-api/encoding/header";
 *
 * const header = {
 *   cmdId: 1,
 *   bodyLength: 0,
 *   channelId: 250,
 *   messageId: 1,
 *   encryption: 0xdc12,
 *   messageClass: BAICHUAN_MESSAGE_CLASS.LEGACY,
 * };
 *
 * const bytes = encode(baichuanHeader(), header);
 *
 * assertEquals(bytes.length, 20);
 * assertEquals(decode(baichuanHeader(), bytes), header);
 * ```
 *
 * @module
 */

import {
  array,
  bytes,
  type Coder,
  computedRef,
  ref,
  refine,
  struct,
  u16be,
  u16le,
  u32le,
  u8,
} from "@hertzg/binstruct";

/** The four bytes `f0 de bc 0a` that open every message, read as `u32le`. */
export const BAICHUAN_MAGIC = 0x0abcdef0;

/**
 * Message classes (bytes 18-19, read as `u16be`). The class decides the
 * header length, see {@link headerLength}.
 *
 * @example Pick the class for a request
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { BAICHUAN_MESSAGE_CLASS } from "@hertzg/reolink-api/encoding/header";
 *
 * assertEquals(BAICHUAN_MESSAGE_CLASS.MODERN_WITH_OFFSET, 0x1464);
 * ```
 */
export const BAICHUAN_MESSAGE_CLASS = {
  /** 20-byte header with an encryption marker, used for the nonce request. */
  LEGACY: 0x1465,
  /** 20-byte header with an encryption marker, used for replies to it. */
  MODERN: 0x1466,
  /** 24-byte header with a status code and payload offset. */
  MODERN_WITH_OFFSET: 0x1464,
  /** Also 24 bytes with a status code and payload offset. */
  MODERN_WITH_OFFSET_ALT: 0x0000,
} as const;

/**
 * A decoded Baichuan message header, without the magic.
 *
 * Bytes 16-17 mean different things by header length: a 24-byte header has
 * `status` and `payloadOffset`, a 20-byte header has `encryption` instead.
 */
export type BaichuanHeader =
  & {
    /** Command id, see `BAICHUAN_CMD` in `@hertzg/reolink-api/protocol/message`. */
    cmdId: number;
    /** Byte length of everything after the header: body plus payload. */
    bodyLength: number;
    /** Channel id: `0` or `251` for push, `250` for the host, `1`-`100` for a channel plus one. */
    channelId: number;
    /** Message id (24 bits) that a reply echoes back. */
    messageId: number;
    /** Message class, one of {@link BAICHUAN_MESSAGE_CLASS}. */
    messageClass: number;
  }
  & (
    | {
      /** Status code, such as `200` OK or `401` unauthorized. */
      status: number;
      /** Where the binary payload starts inside the body, `0` meaning no payload. */
      payloadOffset: number;
      /** Only in 20-byte headers. */
      encryption?: never;
    }
    | {
      /** Encryption marker: the low byte names the body cipher. */
      encryption: number;
      /** Only in 24-byte headers. */
      status?: never;
      /** Only in 24-byte headers. */
      payloadOffset?: never;
    }
  );

/**
 * Returns the header length in bytes for a message class.
 *
 * @param messageClass The message class read from bytes 18-19 of the header.
 * @returns `24` for the `MODERN_WITH_OFFSET` classes, `20` for every other.
 *
 * @example Pick the header length for a class
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import {
 *   BAICHUAN_MESSAGE_CLASS,
 *   headerLength,
 * } from "@hertzg/reolink-api/encoding/header";
 *
 * assertEquals(headerLength(BAICHUAN_MESSAGE_CLASS.MODERN_WITH_OFFSET), 24);
 * assertEquals(headerLength(BAICHUAN_MESSAGE_CLASS.MODERN), 20);
 * ```
 */
export function headerLength(messageClass: number): 20 | 24 {
  return messageClass === BAICHUAN_MESSAGE_CLASS.MODERN_WITH_OFFSET ||
      messageClass === BAICHUAN_MESSAGE_CLASS.MODERN_WITH_OFFSET_ALT
    ? 24
    : 20;
}

/**
 * Creates a coder for a {@link BaichuanHeader}.
 *
 * {@link headerLength} of `messageClass` picks the layout: 24-byte headers
 * decode to `status` and `payloadOffset`, 20-byte ones to `encryption`.
 * Encoding expects the fields that match the class. Decoding throws when the
 * first four bytes are not the magic, encoding always writes it.
 *
 * @returns A coder for a {@link BaichuanHeader}.
 *
 * @example Decode a 24-byte reply header
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { decodeHex } from "@std/encoding/hex";
 * import { baichuanHeader } from "@hertzg/reolink-api/encoding/header";
 *
 * const [header, bytesRead] = baichuanHeader().decode(
 *   decodeHex("f0debc0a1f00000000000000fb030000c800146400000000"),
 * );
 *
 * assertEquals(header.cmdId, 31);
 * assertEquals(header.status, 200);
 * assertEquals(bytesRead, 24);
 * ```
 */
export function baichuanHeader(): Coder<BaichuanHeader> {
  const messageId = refine(bytes(3), {
    refine: (raw: Uint8Array) => raw[0] | (raw[1] << 8) | (raw[2] << 16),
    unrefine: (id: number) =>
      Uint8Array.of(id & 0xff, (id >>> 8) & 0xff, (id >>> 16) & 0xff),
  });
  const messageClass = u16be();
  const raw = struct({
    magic: u32le(),
    cmdId: u32le(),
    bodyLength: u32le(),
    channelId: u8(),
    messageId: messageId(),
    code: u16le(),
    messageClass,
    payloadOffset: array(
      u32le(),
      computedRef(
        [ref(messageClass)],
        (cls) => headerLength(cls) === 24 ? 1 : 0,
      ),
    ),
  });

  return refine(raw, {
    refine: (
      { magic, code, payloadOffset: [payloadOffset], ...header },
    ): BaichuanHeader => {
      if (magic !== BAICHUAN_MAGIC) {
        throw new Error(
          `Baichuan header has no magic: got 0x${
            magic.toString(16).padStart(8, "0")
          }`,
        );
      }
      return payloadOffset === undefined
        ? { ...header, encryption: code }
        : { ...header, status: code, payloadOffset };
    },
    unrefine: (header: BaichuanHeader) =>
      header.encryption === undefined
        ? {
          ...header,
          magic: BAICHUAN_MAGIC,
          code: header.status,
          payloadOffset: [header.payloadOffset],
        }
        : {
          ...header,
          magic: BAICHUAN_MAGIC,
          code: header.encryption,
          payloadOffset: [],
        },
  })();
}
