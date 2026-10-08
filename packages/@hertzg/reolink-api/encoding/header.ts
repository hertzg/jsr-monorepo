/**
 * Baichuan message header coder.
 *
 * Every Baichuan message starts with a little-endian header. Its length
 * depends on the message class: classes `0x1464` and `0x0000` carry a
 * trailing payload offset and are 24 bytes, every other class is 20 bytes.
 *
 * ```
 * offset  size  field
 * 0       4     magic f0 de bc 0a
 * 4       4     cmdId          u32le
 * 8       4     bodyLength     u32le
 * 12      1     channelId      u8     0/251 push, 1-100 channel + 1, 250 host
 * 13      3     messageId      u24le
 * 16      2     code           u16le  status code or encryption marker
 * 18      2     messageClass   u16be
 * 20      4     payloadOffset  u32le  24-byte classes only
 * ```
 *
 * @example Encode and decode the nonce request header
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { decode, encode } from "@hertzg/binstruct";
 * import { baichuanHeader } from "@hertzg/reolink-api/encoding/header";
 *
 * const header = {
 *   cmdId: 1,
 *   bodyLength: 0,
 *   channelId: 250,
 *   messageId: 1,
 *   code: 0xdc12,
 *   messageClass: 0x1465,
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
 * A decoded Baichuan message header, without the magic.
 *
 * `payloadOffset` is present exactly when {@link headerLength} of
 * `messageClass` is 24.
 */
export type BaichuanHeader = {
  /** Command id, such as `1` for login or `33` for a pushed alarm event. */
  cmdId: number;
  /** Byte length of everything after the header: body plus payload. */
  bodyLength: number;
  /** Channel id: `0` or `251` for push, `250` for the host, `1`-`100` for a channel plus one. */
  channelId: number;
  /** Message id (24 bits) that a reply echoes back. */
  messageId: number;
  /** Status code (`200` OK, `401` unauthorized) in 24-byte headers, encryption marker in 20-byte ones. */
  code: number;
  /** Message class, such as `0x1464`, `0x1465` or `0x1466`. */
  messageClass: number;
  /** Where the binary payload starts inside the body, `0` meaning no payload. */
  payloadOffset?: number;
};

/**
 * Returns the header length in bytes for a message class.
 *
 * @param messageClass The message class read from bytes 18-19 of the header.
 * @returns `24` for classes `0x1464` and `0x0000`, `20` for every other class.
 *
 * @example Pick the header length for a class
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { headerLength } from "@hertzg/reolink-api/encoding/header";
 *
 * assertEquals(headerLength(0x1464), 24);
 * assertEquals(headerLength(0x1466), 20);
 * ```
 */
export function headerLength(messageClass: number): 20 | 24 {
  return messageClass === 0x1464 || messageClass === 0x0000 ? 24 : 20;
}

/**
 * Creates a coder for a {@link BaichuanHeader}.
 *
 * The trailing `payloadOffset` is read and written only when
 * {@link headerLength} of `messageClass` is 24. Decoding throws when the
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
 * assertEquals(header.code, 200);
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
    refine: ({ magic, payloadOffset: [payloadOffset], ...header }) => {
      if (magic !== BAICHUAN_MAGIC) {
        throw new Error(
          `Baichuan header has no magic: got 0x${
            magic.toString(16).padStart(8, "0")
          }`,
        );
      }
      return payloadOffset === undefined
        ? header
        : { ...header, payloadOffset };
    },
    unrefine: ({ payloadOffset = 0, ...header }: BaichuanHeader) => ({
      magic: BAICHUAN_MAGIC,
      ...header,
      payloadOffset: headerLength(header.messageClass) === 24
        ? [payloadOffset]
        : [],
    }),
  })();
}
