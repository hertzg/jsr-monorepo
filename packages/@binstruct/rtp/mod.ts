/**
 * RTP fixed header encoding and decoding (RFC 3550).
 *
 * Every RTP packet opens with a 12-byte fixed header, an optional
 * contributing-source (CSRC) list sized by the header's `csrcCount` field,
 * and the codec payload:
 *
 * ```text
 *  0                   1                   2                   3
 *  0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * |V=2|P|X|  CC   |M|     PT      |       Sequence Number        |
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * |                           Timestamp                          |
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * |           Synchronization Source (SSRC) Identifier           |
 * +=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+
 * |            Contributing Source (CSRC) Identifiers            |
 * |                             ....                              |
 * +=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+
 * |                        Payload (variable)                     |
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * ```
 *
 * `csrcCount` (the low 4 bits of the first octet) gives the number of 32-bit
 * CSRC identifiers that follow the SSRC, so the CSRC list is always
 * `csrcCount` words long. Bit-packed fields (version/padding/extension/CC,
 * marker/payload-type) are exposed as nested objects via `bitStruct`,
 * keeping the on-wire layout faithful while preserving named-field access.
 *
 * This package covers the fixed header and CSRC list only. When `extension`
 * is set, RFC 3550 §5.3.1 defines a header-extension block between the CSRC
 * list and the payload; this coder does not parse it and instead treats
 * everything after the CSRC list as opaque `payload` bytes. Deeper parsing,
 * extension headers, and payload-format-specific decoding (RTCP, SRTP, codec
 * payloads) are left to future packages — v0.0.1 is header-level only.
 *
 * @example Round-trip a packet with no CSRC entries
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { rtpPacket, RTP_HEADER_MIN_SIZE, RTP_VERSION } from "@binstruct/rtp";
 *
 * const coder = rtpPacket();
 * const payload = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
 * const packet = {
 *   versionFlags: { version: RTP_VERSION, padding: 0, extension: 0, csrcCount: 0 },
 *   markerPayloadType: { marker: 0, payloadType: 0 },
 *   sequenceNumber: 1,
 *   timestamp: 0,
 *   ssrc: 0x11223344,
 *   csrc: [],
 *   payload,
 * };
 *
 * const buffer = new Uint8Array(RTP_HEADER_MIN_SIZE + payload.length);
 * const written = coder.encode(packet, buffer);
 * const [decoded, read] = coder.decode(buffer.subarray(0, written));
 *
 * assertEquals(written, RTP_HEADER_MIN_SIZE + payload.length);
 * assertEquals(read, written);
 * assertEquals(decoded.ssrc, packet.ssrc);
 * assertEquals(decoded.payload, payload);
 * ```
 *
 * @module
 */

import {
  array,
  bitStruct,
  bytes,
  type Coder,
  computedRef,
  ref,
  struct,
  u16be,
  u32be,
} from "@hertzg/binstruct";

/**
 * Size in bytes of the fixed RTP header (version/padding/extension/CC,
 * marker/PT, sequence number, timestamp, SSRC) before any CSRC identifiers.
 */
export const RTP_HEADER_MIN_SIZE = 12;

/**
 * RTP protocol version defined by RFC 3550. Carried in the 2-bit `version`
 * field of every packet; any other value indicates a non-RTP or malformed
 * packet.
 */
export const RTP_VERSION = 2;

/**
 * Decoded RTP fixed header and payload (RFC 3550).
 *
 * The `csrc` array's length is always `versionFlags.csrcCount`; on encode,
 * `versionFlags.csrcCount` must match `csrc.length` or the CSRC list will be
 * mis-sized. Header extensions (RFC 3550 §5.3.1) are not parsed — when
 * `versionFlags.extension` is set, the extension block is included verbatim
 * at the start of `payload`.
 *
 * @property versionFlags       - Packed version/padding/extension/CSRC-count octet.
 * @property versionFlags.version    - Protocol version. Always {@linkcode RTP_VERSION} for RTP.
 * @property versionFlags.padding    - 1 if the payload has trailing padding octets, whose count is the last payload byte.
 * @property versionFlags.extension  - 1 if a header extension follows the CSRC list (not parsed by this coder).
 * @property versionFlags.csrcCount  - Number of CSRC identifiers in `csrc` (0-15).
 * @property markerPayloadType         - Packed marker/payload-type octet.
 * @property markerPayloadType.marker  - Payload-format-defined marker bit (e.g. frame boundary).
 * @property markerPayloadType.payloadType - RTP payload type (0-127). See RFC 3551 for static assignments.
 * @property sequenceNumber - Increments by one per packet; used to detect loss and restore order.
 * @property timestamp      - Sampling instant of the first payload octet, in the media clock's units.
 * @property ssrc           - Synchronization source identifier, randomly chosen to be unique within a session.
 * @property csrc           - Contributing source identifiers inserted by mixers; length equals `versionFlags.csrcCount`.
 * @property payload        - Payload-format-specific bytes (and, if `extension` is set, the unparsed extension block).
 */
export interface RtpPacket {
  versionFlags: {
    version: number;
    padding: number;
    extension: number;
    csrcCount: number;
  };
  markerPayloadType: {
    marker: number;
    payloadType: number;
  };
  sequenceNumber: number;
  timestamp: number;
  ssrc: number;
  csrc: number[];
  payload: Uint8Array;
}

/**
 * Creates a coder for an RTP packet's fixed header, CSRC list, and payload
 * (RFC 3550).
 *
 * The CSRC list's length is derived from `versionFlags.csrcCount`, so a
 * packet with no contributing sources needs `csrcCount: 0` and `csrc: []`.
 * Nothing is validated on encode beyond what `bitStruct` enforces (field
 * values must fit their bit widths) — `csrcCount` and `csrc.length` are not
 * cross-checked, matching this repo's no-defensive-programming stance.
 *
 * Header extensions are not parsed; the rest of the buffer after the CSRC
 * list — extension block included, if `extension` is set — is surfaced
 * verbatim as `payload`.
 *
 * @returns A coder for {@linkcode RtpPacket} values.
 *
 * @example Round-trip a packet with two CSRC identifiers
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { rtpPacket, RTP_HEADER_MIN_SIZE, RTP_VERSION } from "@binstruct/rtp";
 *
 * const coder = rtpPacket();
 * const payload = new Uint8Array([0x01, 0x02, 0x03]);
 * const packet = {
 *   versionFlags: { version: RTP_VERSION, padding: 0, extension: 0, csrcCount: 2 },
 *   markerPayloadType: { marker: 1, payloadType: 8 },
 *   sequenceNumber: 4321,
 *   timestamp: 160000,
 *   ssrc: 0xcafebabe,
 *   csrc: [0x11111111, 0x22222222],
 *   payload,
 * };
 *
 * const buffer = new Uint8Array(RTP_HEADER_MIN_SIZE + 8 + payload.length);
 * const written = coder.encode(packet, buffer);
 * const [decoded, read] = coder.decode(buffer.subarray(0, written));
 *
 * assertEquals(written, RTP_HEADER_MIN_SIZE + 8 + payload.length);
 * assertEquals(read, written);
 * assertEquals(decoded.csrc, packet.csrc);
 * assertEquals(decoded.markerPayloadType.marker, 1);
 * assertEquals(decoded.payload, payload);
 * ```
 *
 * @example Decode a known-wire minimal packet (no CSRC, no payload)
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { rtpPacket, RTP_HEADER_MIN_SIZE, RTP_VERSION } from "@binstruct/rtp";
 *
 * // deno-fmt-ignore
 * const wire = new Uint8Array([
 *   0x80, 0x00, 0x00, 0x01,
 *   0x00, 0x00, 0x00, 0x00,
 *   0x00, 0x00, 0x00, 0x2a,
 * ]);
 *
 * const [decoded, read] = rtpPacket().decode(wire);
 *
 * assertEquals(read, RTP_HEADER_MIN_SIZE);
 * assertEquals(decoded.versionFlags.version, RTP_VERSION);
 * assertEquals(decoded.versionFlags.csrcCount, 0);
 * assertEquals(decoded.sequenceNumber, 1);
 * assertEquals(decoded.ssrc, 0x2a);
 * assertEquals(decoded.csrc, []);
 * assertEquals(decoded.payload.length, 0);
 * ```
 */
export function rtpPacket(): Coder<RtpPacket> {
  const versionFlags = bitStruct({
    version: 2,
    padding: 1,
    extension: 1,
    csrcCount: 4,
  });

  return struct({
    versionFlags,
    markerPayloadType: bitStruct({
      marker: 1,
      payloadType: 7,
    }),
    sequenceNumber: u16be(),
    timestamp: u32be(),
    ssrc: u32be(),
    csrc: array(
      u32be(),
      computedRef([ref(versionFlags)], (vf) => vf.csrcCount),
    ),
    payload: bytes(),
  });
}
