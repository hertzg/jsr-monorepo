/**
 * IPsec Encapsulating Security Payload (ESP) header encoding and decoding
 * (RFC 4303).
 *
 * An ESP packet opens with an 8-byte unencrypted header followed by the
 * encrypted payload:
 *
 * ```text
 *  0      7 8     15 16    23 24    31
 * +--------+--------+--------+--------+
 * |      Security Parameters Index    |
 * |               (SPI)               |
 * +--------+--------+--------+--------+
 * |           Sequence Number         |
 * +--------+--------+--------+--------+
 * |                                   |
 * ~           Payload Data            ~
 * |                                   |
 * +-----------------------------------+
 * ```
 *
 * RFC 4303 defines further structure inside the payload — padding, a pad
 * length, a next-header field, and an Integrity Check Value trailer — but
 * all of it lives inside the encrypted (and often authenticated) region.
 * None of it can be located or interpreted without performing the actual
 * decryption, which is out of scope for a binary-structure coder. This
 * package therefore stops at the 8-byte header: `payloadData` is handed
 * back as opaque bytes, rest-of-buffer, for the caller to decrypt with
 * whatever crypto library and security association it has on hand.
 *
 * @example Round-trip an ESP header with an opaque payload
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { espPacket } from "@binstruct/esp";
 *
 * const coder = espPacket();
 * const packet = {
 *   spi: 0x12345678,
 *   sequenceNumber: 1,
 *   payloadData: new Uint8Array([0xde, 0xad, 0xbe, 0xef]),
 * };
 *
 * const buffer = new Uint8Array(64);
 * const written = coder.encode(packet, buffer);
 * const [decoded, read] = coder.decode(buffer.subarray(0, written));
 *
 * assertEquals(written, read);
 * assertEquals(decoded.spi, packet.spi);
 * assertEquals(decoded.sequenceNumber, packet.sequenceNumber);
 * assertEquals(decoded.payloadData, packet.payloadData);
 * ```
 *
 * @module
 */
import { bytes, type Coder, struct, u32be } from "@hertzg/binstruct";

/**
 * Number of octets in the unencrypted ESP header (SPI + Sequence Number).
 */
export const ESP_HEADER_SIZE = 8;

/**
 * IP protocol number assigned to ESP (`50`). The value an IPv4 `protocol` /
 * IPv6 `nextHeader` field carries when its payload is an ESP packet.
 */
export const IP_PROTOCOL_ESP = 50;

/**
 * Decoded ESP header and opaque payload (RFC 4303).
 *
 * @property spi            - Security Parameters Index, together with the destination address and protocol identifies the security association. Values 1-255 are reserved by IANA.
 * @property sequenceNumber - Monotonically increasing counter used for anti-replay protection within a security association.
 * @property payloadData    - Everything after the header: encrypted payload, padding, pad length, next header, and (if present) the ICV — all opaque without decryption.
 */
export interface EspPacket {
  spi: number;
  sequenceNumber: number;
  payloadData: Uint8Array<ArrayBufferLike>;
}

/**
 * Creates a coder for an IPsec ESP header (RFC 4303) — an 8-byte header
 * (`spi`, `sequenceNumber`) followed by a payload that absorbs the rest of
 * the buffer on decode.
 *
 * The payload is never parsed or decrypted: RFC 4303's padding, pad-length,
 * next-header and ICV trailer fields all live inside the encrypted region,
 * so locating them requires the security association's cipher and key,
 * which this package does not have.
 *
 * @returns A coder for {@link EspPacket}.
 *
 * @example Decode a known-wire ESP header
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { espPacket, ESP_HEADER_SIZE } from "@binstruct/esp";
 *
 * // deno-fmt-ignore
 * const wire = new Uint8Array([
 *   0x00, 0x00, 0x03, 0x00, // spi = 768
 *   0x00, 0x00, 0x00, 0x01, // sequenceNumber = 1
 *   0xaa, 0xbb, 0xcc, 0xdd, // opaque payloadData
 * ]);
 *
 * const [decoded, read] = espPacket().decode(wire);
 *
 * assertEquals(read, wire.length);
 * assertEquals(decoded.spi, 768);
 * assertEquals(decoded.sequenceNumber, 1);
 * assertEquals(decoded.payloadData, wire.subarray(ESP_HEADER_SIZE));
 * ```
 */
export function espPacket(): Coder<EspPacket> {
  return struct({
    spi: u32be(),
    sequenceNumber: u32be(),
    payloadData: bytes(),
  });
}
