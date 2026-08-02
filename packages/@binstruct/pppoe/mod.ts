/**
 * PPPoE (PPP over Ethernet) header encoding and decoding (RFC 2516).
 *
 * A PPPoE frame opens with a 6-byte header followed by a variable-length
 * payload:
 *
 * ```text
 *  0                   1                   2                   3
 *  0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * |  VER  | TYPE  |      CODE     |          SESSION ID          |
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * |            LENGTH            |           PAYLOAD ...
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * ```
 *
 * `version` and `type` are each 4-bit fields packed into the first octet;
 * both are fixed at `1` by RFC 2516. `code` distinguishes Discovery stage
 * packets (PADI, PADO, PADR, PADS, PADT) from session data. `length` is the
 * payload size in octets, so the payload is always `length` bytes long — it
 * does not include the 6-byte header itself.
 *
 * PPPoE runs directly over Ethernet using two dedicated EtherTypes: Discovery
 * stage frames ({@linkcode ETHERTYPE_PPPOE_DISCOVERY}) carry PADI/PADO/PADR/
 * PADS/PADT, while Session stage frames ({@linkcode ETHERTYPE_PPPOE_SESSION})
 * carry PPP frames as the PPPoE payload.
 *
 * This package covers the 6-byte header and its payload framing only. The
 * Discovery stage TAG-based TLV encoding (TAG_TYPE/TAG_LENGTH/TAG_VALUE) and
 * the PPP protocol carried inside a session's payload are out of scope for
 * v0.0.1 — the `payload` field is handed back as raw bytes for callers to
 * parse further.
 *
 * @example Round-trip a PADI discovery packet
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { pppoeHeader, PPPOE_CODE, PPPOE_HEADER_SIZE } from "@binstruct/pppoe";
 *
 * const coder = pppoeHeader();
 * const packet = {
 *   versionType: { version: 1, type: 1 },
 *   code: PPPOE_CODE.PADI,
 *   sessionId: 0,
 *   length: 4,
 *   payload: new Uint8Array([0x01, 0x01, 0x00, 0x00]),
 * };
 *
 * const buffer = new Uint8Array(PPPOE_HEADER_SIZE + packet.payload.length);
 * const written = coder.encode(packet, buffer);
 * const [decoded, read] = coder.decode(buffer.subarray(0, written));
 *
 * assertEquals(written, read);
 * assertEquals(decoded.code, PPPOE_CODE.PADI);
 * assertEquals(decoded.sessionId, 0);
 * assertEquals(decoded.payload, packet.payload);
 * ```
 *
 * @module
 */

import {
  bitStruct,
  bytes,
  type Coder,
  ref,
  struct,
  u16be,
  u8be,
} from "@hertzg/binstruct";

/**
 * Size in bytes of the fixed PPPoE header (version/type, code, session ID,
 * length). The `length` field does not include these 6 bytes — it covers
 * only the payload that follows.
 */
export const PPPOE_HEADER_SIZE = 6;

/**
 * EtherType assigned to the PPPoE Discovery stage (`0x8863`). The value an
 * Ethernet II frame's `etherType` field carries when its payload is a
 * Discovery stage PPPoE packet (PADI, PADO, PADR, PADS, PADT).
 */
export const ETHERTYPE_PPPOE_DISCOVERY = 0x8863;

/**
 * EtherType assigned to the PPPoE Session stage (`0x8864`). The value an
 * Ethernet II frame's `etherType` field carries when its payload is a
 * Session stage PPPoE packet carrying a PPP frame.
 */
export const ETHERTYPE_PPPOE_SESSION = 0x8864;

/**
 * Values used by the PPPoE header's `code` field, distinguishing Session
 * data from the five Discovery stage packet types.
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { PPPOE_CODE } from "@binstruct/pppoe";
 *
 * assertEquals(PPPOE_CODE.PADI, 0x09);
 * assertEquals(PPPOE_CODE.SESSION_DATA, 0x00);
 * ```
 */
export const PPPOE_CODE = {
  /** Session stage data — the payload carries a PPP frame. */
  SESSION_DATA: 0x00,
  /** PPPoE Active Discovery Offer, sent by an Access Concentrator in reply to a PADI. */
  PADO: 0x07,
  /** PPPoE Active Discovery Initiation, broadcast by a Host to begin Discovery. */
  PADI: 0x09,
  /** PPPoE Active Discovery Request, sent by a Host to the chosen Access Concentrator. */
  PADR: 0x19,
  /** PPPoE Active Discovery Session-confirmation, sent by an Access Concentrator in reply to a PADR. */
  PADS: 0x65,
  /** PPPoE Active Discovery Terminate, sent by either peer to end a session. */
  PADT: 0xa7,
} as const;

/**
 * Decoded PPPoE header (RFC 2516).
 *
 * @property versionType        - Bit-packed version/type octet.
 * @property versionType.version - Protocol version, fixed at `1` by RFC 2516.
 * @property versionType.type    - Protocol type, fixed at `1` by RFC 2516.
 * @property code                - Packet code. See {@linkcode PPPOE_CODE}.
 * @property sessionId           - Session identifier; `0` during Discovery, assigned by the Access Concentrator for the Session stage.
 * @property length              - Payload size in octets, not including the 6-byte header.
 * @property payload             - Raw payload bytes; its length is always `length` after decoding. Discovery stage TAGs and PPP session frames are left unparsed.
 */
export interface PppoeHeader {
  versionType: {
    version: number;
    type: number;
  };
  code: number;
  sessionId: number;
  length: number;
  payload: Uint8Array;
}

/**
 * Creates a coder for a PPPoE header and its payload (RFC 2516).
 *
 * The payload length is derived from the header's `length` field
 * (`payload.length === length`); `length` itself is written verbatim on
 * encode, not recomputed, so callers are responsible for keeping it in sync
 * with `payload.length`.
 *
 * @returns A coder for {@linkcode PppoeHeader} values.
 *
 * @example Decode a known PADT (session teardown) wire capture
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { pppoeHeader, PPPOE_CODE, PPPOE_HEADER_SIZE } from "@binstruct/pppoe";
 *
 * const wire = new Uint8Array([
 *   0x11, 0xa7, 0x00, 0x2a, 0x00, 0x00,
 * ]);
 *
 * const [decoded, read] = pppoeHeader().decode(wire);
 *
 * assertEquals(read, PPPOE_HEADER_SIZE);
 * assertEquals(decoded.versionType, { version: 1, type: 1 });
 * assertEquals(decoded.code, PPPOE_CODE.PADT);
 * assertEquals(decoded.sessionId, 0x002a);
 * assertEquals(decoded.length, 0);
 * assertEquals(decoded.payload.length, 0);
 * ```
 *
 * @example Empty-payload session keepalive
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { pppoeHeader, PPPOE_CODE, PPPOE_HEADER_SIZE } from "@binstruct/pppoe";
 *
 * const coder = pppoeHeader();
 * const buffer = new Uint8Array(PPPOE_HEADER_SIZE);
 * const written = coder.encode({
 *   versionType: { version: 1, type: 1 },
 *   code: PPPOE_CODE.SESSION_DATA,
 *   sessionId: 0x1234,
 *   length: 0,
 *   payload: new Uint8Array(0),
 * }, buffer);
 * const [decoded] = coder.decode(buffer);
 *
 * assertEquals(written, PPPOE_HEADER_SIZE);
 * assertEquals(decoded.sessionId, 0x1234);
 * assertEquals(decoded.payload.length, 0);
 * ```
 */
export function pppoeHeader(): Coder<PppoeHeader> {
  const length = u16be();

  return struct({
    versionType: bitStruct({
      version: 4,
      type: 4,
    }),
    code: u8be(),
    sessionId: u16be(),
    length,
    payload: bytes(ref(length)),
  });
}
