/**
 * VXLAN (Virtual Extensible LAN) header encoding and decoding (RFC 7348).
 *
 * VXLAN encapsulates an Ethernet frame inside a UDP datagram (destination
 * port {@linkcode VXLAN_PORT} by convention) behind an 8-byte header:
 *
 * ```text
 *  0      7 8     15 16    23 24    31
 * +--------+--------+--------+--------+
 * |  Flags |           Reserved1      |
 * +--------+--------+--------+--------+
 * |   VNI (24 bits)          |Reserv2 |
 * +--------+--------+--------+--------+
 * |                                    |
 * |         Inner Ethernet Frame      |
 * |              (variable)           |
 * +------------------------------------+
 * ```
 *
 * The header is two 32-bit words:
 *
 * - Word 1: an 8-bit `flags` field followed by a 24-bit `reserved1` field.
 *   {@linkcode VXLAN_FLAG_VALID_VNI} (`0x08`) is the only flag bit RFC 7348
 *   defines — the "I" (VNI valid) flag, which MUST be set on every VXLAN
 *   packet. The other 7 bits of `flags` and all of `reserved1` are reserved
 *   and MUST be transmitted as zero, ignored on receipt.
 * - Word 2: a 24-bit `vni` (VXLAN Network Identifier) field followed by an
 *   8-bit `reserved2` field, also reserved and MUST be zero.
 *
 * Following the header is the encapsulated inner Ethernet frame, consuming
 * the rest of the buffer.
 *
 * Scope for `v0.0.1` is deliberately shallow: this coder covers the 8-byte
 * header only. `innerFrame` is surfaced as a raw byte slice — pair it with
 * `@binstruct/ethernet` to parse it further. Nothing is validated on decode
 * (a stray flag bit or non-zero reserved field decodes verbatim rather than
 * throwing), and nothing beyond the header — no VTEP discovery, no
 * multicast/BGP EVPN control plane — is in scope.
 *
 * @example Round-trip a VXLAN header wrapping a tiny inner frame
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { vxlanHeader, VXLAN_FLAG_VALID_VNI } from "@binstruct/vxlan";
 *
 * const coder = vxlanHeader();
 * const innerFrame = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
 * const packet = {
 *   flagsReserved1: { flags: VXLAN_FLAG_VALID_VNI, reserved1: 0 },
 *   vniReserved2: { vni: 42, reserved2: 0 },
 *   innerFrame,
 * };
 *
 * const buffer = new Uint8Array(64);
 * const written = coder.encode(packet, buffer);
 * const [decoded, read] = coder.decode(buffer.subarray(0, written));
 *
 * assertEquals(written, read);
 * assertEquals(decoded.flagsReserved1.flags, VXLAN_FLAG_VALID_VNI);
 * assertEquals(decoded.vniReserved2.vni, 42);
 * assertEquals(decoded.innerFrame, innerFrame);
 * ```
 *
 * @module
 */

import { bitStruct, bytes, type Coder, struct } from "@hertzg/binstruct";

/**
 * Size in bytes of the fixed VXLAN header, before the inner frame.
 */
export const VXLAN_HEADER_SIZE = 8;

/**
 * IANA-assigned UDP destination port for VXLAN (`4789`).
 */
export const VXLAN_PORT = 4789;

/**
 * The "I" flag bit (`0x08`) within the header's `flags` byte — RFC 7348
 * calls this the VNI-valid flag and requires it to be set on every VXLAN
 * packet.
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { VXLAN_FLAG_VALID_VNI } from "@binstruct/vxlan";
 *
 * assertEquals(VXLAN_FLAG_VALID_VNI, 0x08);
 * assertEquals((0x08 & VXLAN_FLAG_VALID_VNI) !== 0, true);
 * ```
 */
export const VXLAN_FLAG_VALID_VNI = 0x08;

/**
 * Decoded VXLAN header (RFC 7348) plus the encapsulated inner frame.
 *
 * @property flagsReserved1 - First header word: `flags` (8 bits, see {@linkcode VXLAN_FLAG_VALID_VNI}) and `reserved1` (24 bits, MUST be zero).
 * @property vniReserved2   - Second header word: `vni` (24-bit VXLAN Network Identifier) and `reserved2` (8 bits, MUST be zero).
 * @property innerFrame     - The encapsulated Ethernet frame, verbatim. Consumes the rest of the buffer.
 */
export interface VxlanHeader {
  flagsReserved1: {
    flags: number;
    reserved1: number;
  };
  vniReserved2: {
    vni: number;
    reserved2: number;
  };
  innerFrame: Uint8Array;
}

/**
 * Creates a coder for a VXLAN header (RFC 7348) and its encapsulated inner
 * frame.
 *
 * Nothing is validated or computed on encode — `flagsReserved1.flags` (which
 * should carry {@linkcode VXLAN_FLAG_VALID_VNI}), the reserved fields, and
 * `vniReserved2.vni` are all written exactly as given. `innerFrame` is
 * encoded verbatim and, on decode, consumes every byte after the 8-byte
 * header.
 *
 * @returns A coder for {@linkcode VxlanHeader} values.
 *
 * @example Decode a known wire-format header
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { vxlanHeader, VXLAN_FLAG_VALID_VNI, VXLAN_HEADER_SIZE } from "@binstruct/vxlan";
 *
 * // deno-fmt-ignore
 * const wire = new Uint8Array([
 *   0x08, 0x00, 0x00, 0x00,
 *   0x00, 0x00, 0x2a, 0x00,
 *   0xaa, 0xbb, 0xcc, 0xdd,
 * ]);
 *
 * const [decoded, read] = vxlanHeader().decode(wire);
 *
 * assertEquals(read, wire.length);
 * assertEquals(decoded.flagsReserved1.flags, VXLAN_FLAG_VALID_VNI);
 * assertEquals(decoded.vniReserved2.vni, 42);
 * assertEquals(decoded.innerFrame.length, wire.length - VXLAN_HEADER_SIZE);
 * ```
 *
 * @example Empty inner frame (header only)
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { vxlanHeader, VXLAN_FLAG_VALID_VNI, VXLAN_HEADER_SIZE } from "@binstruct/vxlan";
 *
 * const coder = vxlanHeader();
 * const buffer = new Uint8Array(VXLAN_HEADER_SIZE);
 * const written = coder.encode({
 *   flagsReserved1: { flags: VXLAN_FLAG_VALID_VNI, reserved1: 0 },
 *   vniReserved2: { vni: 0, reserved2: 0 },
 *   innerFrame: new Uint8Array(0),
 * }, buffer);
 * const [decoded] = coder.decode(buffer);
 *
 * assertEquals(written, VXLAN_HEADER_SIZE);
 * assertEquals(decoded.innerFrame.length, 0);
 * ```
 */
export function vxlanHeader(): Coder<VxlanHeader> {
  return struct({
    flagsReserved1: bitStruct({
      flags: 8,
      reserved1: 24,
    }),
    vniReserved2: bitStruct({
      vni: 24,
      reserved2: 8,
    }),
    innerFrame: bytes(),
  });
}
