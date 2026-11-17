/**
 * Interleaved binary data, the `$` block of RFC 7826 section 14.
 *
 * A `$` block carries one upper-layer PDU (an RTP or RTCP packet) on the RTSP
 * connection itself. It is not an RTSP message: it has no start-line, no
 * headers and no CRLF after it.
 *
 * ```
 * offset  size    field
 * 0       1       "$" (0x24)
 * 1       1       Channel ID    u8
 * 2       2       Length        u16, network order
 * 4       Length  Binary data
 * ```
 *
 * @example Encode a block and decode it back
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import {
 *   decodeInterleavedBinaryData,
 *   encodeInterleavedBinaryData,
 * } from "@hertzg/rtsp/encoding/interleaved";
 *
 * const data = {
 *   channelId: 0,
 *   binaryData: new Uint8Array([0x80, 0x60, 0x00, 0x01]),
 * };
 *
 * const octets = encodeInterleavedBinaryData(data);
 *
 * // deno-fmt-ignore
 * assertEquals(octets, new Uint8Array([
 *   0x24, 0x00, 0x00, 0x04,
 *   0x80, 0x60, 0x00, 0x01,
 * ]));
 * assertEquals(decodeInterleavedBinaryData(octets), [data, 8]);
 * ```
 *
 * @module
 */

/** The `$` octet that opens every block. */
const DOLLAR_OCTET = 0x24;

/** Octets before the binary data: `$`, Channel ID and the two Length octets. */
const HEADER_LENGTH_OCTETS = 4;

/**
 * One `$` block: the channel it travels on and the upper-layer PDU it carries.
 *
 * @example Describe an RTCP packet on channel 1
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import {
 *   encodeInterleavedBinaryData,
 *   type InterleavedBinaryData,
 * } from "@hertzg/rtsp/encoding/interleaved";
 *
 * const data: InterleavedBinaryData = {
 *   channelId: 1,
 *   binaryData: new Uint8Array([0x80, 0xc8, 0x00, 0x06]),
 * };
 *
 * assertEquals(encodeInterleavedBinaryData(data).length, 8);
 * ```
 */
export type InterleavedBinaryData = {
  /** Channel ID, 0-255, as agreed in the `Transport` header's `interleaved`. */
  channelId: number;
  /** One upper-layer PDU, at most 65535 octets. */
  binaryData: Uint8Array;
};

/**
 * Encodes one `$` block.
 *
 * The caller keeps `channelId` within 0-255 and `binaryData` within 65535
 * octets. Larger values do not fit their fields and wrap silently.
 *
 * @param data The channel and the binary data to send on it.
 * @returns A new array holding the 4-octet header followed by the binary data.
 *
 * @example Encode a block for channel 2
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { encodeInterleavedBinaryData } from "@hertzg/rtsp/encoding/interleaved";
 *
 * const octets = encodeInterleavedBinaryData({
 *   channelId: 2,
 *   binaryData: new Uint8Array([0xde, 0xad, 0xbe]),
 * });
 *
 * // deno-fmt-ignore
 * assertEquals(octets, new Uint8Array([
 *   0x24, 0x02, 0x00, 0x03,
 *   0xde, 0xad, 0xbe,
 * ]));
 * ```
 */
export function encodeInterleavedBinaryData(
  data: InterleavedBinaryData,
): Uint8Array {
  const octets = new Uint8Array(HEADER_LENGTH_OCTETS + data.binaryData.length);
  const view = new DataView(octets.buffer);
  view.setUint8(0, DOLLAR_OCTET);
  view.setUint8(1, data.channelId);
  view.setUint16(2, data.binaryData.length);
  octets.set(data.binaryData, HEADER_LENGTH_OCTETS);
  return octets;
}

/**
 * Decodes one `$` block from the start of `octets`.
 *
 * Short input is normal on a stream, so it is not an error: the result is
 * `undefined` until the whole block has arrived. Octets after the block are
 * left alone, `bytesRead` says where the next item starts.
 *
 * The returned `binaryData` is a copy. It stays valid after the caller reuses
 * or overwrites the buffer behind `octets`.
 *
 * The caller checks that the first octet is `$` before calling. It is not
 * checked here.
 *
 * @param octets Octets starting at a `$` block. May be a view into a larger
 * buffer.
 * @returns `undefined` when more octets are needed, otherwise the block and
 * the number of octets it took.
 *
 * @example Wait for the rest of a block
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { decodeInterleavedBinaryData } from "@hertzg/rtsp/encoding/interleaved";
 *
 * // deno-fmt-ignore
 * const octets = new Uint8Array([
 *   0x24, 0x01, 0x00, 0x02,
 *   0xca, 0xfe,
 *   0x24, 0x00,
 * ]);
 *
 * assertEquals(decodeInterleavedBinaryData(octets.subarray(0, 5)), undefined);
 * assertEquals(decodeInterleavedBinaryData(octets), [
 *   { channelId: 1, binaryData: new Uint8Array([0xca, 0xfe]) },
 *   6,
 * ]);
 * ```
 */
export function decodeInterleavedBinaryData(
  octets: Uint8Array,
): [InterleavedBinaryData, number] | undefined {
  if (octets.length < HEADER_LENGTH_OCTETS) {
    return undefined;
  }
  const view = new DataView(
    octets.buffer,
    octets.byteOffset,
    octets.byteLength,
  );
  const bytesRead = HEADER_LENGTH_OCTETS + view.getUint16(2);
  if (octets.length < bytesRead) {
    return undefined;
  }
  return [
    {
      channelId: view.getUint8(1),
      binaryData: octets.slice(HEADER_LENGTH_OCTETS, bytesRead),
    },
    bytesRead,
  ];
}

/**
 * Tells a `$` block apart from an RTSP message in what the decode stream
 * emits.
 *
 * @param value Anything, usually an item read from the decode stream.
 * @returns `true` when `value` has a numeric `channelId` and a `Uint8Array`
 * `binaryData`.
 *
 * @example Narrow a decoded item
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { isInterleavedBinaryData } from "@hertzg/rtsp/encoding/interleaved";
 *
 * const block = { channelId: 0, binaryData: new Uint8Array([0x80]) };
 * const response = { statusCode: 200, messageBody: new Uint8Array() };
 *
 * assertEquals(isInterleavedBinaryData(block), true);
 * assertEquals(isInterleavedBinaryData(response), false);
 * ```
 */
export function isInterleavedBinaryData(
  value: unknown,
): value is InterleavedBinaryData {
  return typeof value === "object" && value !== null &&
    "channelId" in value && typeof value.channelId === "number" &&
    "binaryData" in value && value.binaryData instanceof Uint8Array;
}
