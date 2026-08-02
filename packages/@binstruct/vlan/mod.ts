/**
 * IEEE 802.1Q VLAN tag encoding and decoding.
 *
 * A VLAN tag is the 4 bytes that follow the {@linkcode TPID_8021Q} (`0x8100`)
 * EtherType in a tagged Ethernet II frame — a 2-byte Tag Control Information
 * (TCI) field, itself three bit-packed subfields, followed by the 2-byte
 * EtherType of the encapsulated payload:
 *
 * ```text
 *  0 1 2 3 4              15 16             31
 * +-+-+-+-+-----------------+-----------------+
 * |  PCP|D|   VLAN ID (VID) |     EtherType   |
 * +-+-+-+-+-----------------+-----------------+
 * |                                           |
 * |             Payload (variable)            |
 * +---------------------------------------------+
 * ```
 *
 * Field breakdown of the first two bytes (the TCI):
 *
 * - `pcp` (3 bits) — Priority Code Point, a class-of-service value (0–7).
 * - `dei` (1 bit) — Drop Eligible Indicator (formerly CFI).
 * - `vlanId` (12 bits) — VLAN Identifier (VID), 0–4095.
 *
 * This coder starts at the TCI, not at the TPID — the caller is expected to
 * have already consumed a `0x8100` EtherType (for example via
 * {@link https://jsr.io/@binstruct/ethernet @binstruct/ethernet}'s
 * `ethernet2Frame` with a `ref()`'d `etherType`) and hand the remaining bytes
 * to {@linkcode vlanTag}.
 *
 * Scope for `v0.0.1`: a single tag only. Double-tagging (QinQ, EtherType
 * `0x88a8`) is out of scope — decode a stacked frame by feeding a `vlanTag()`
 * decode's `payload` back into another `vlanTag()` when its `etherType` is
 * `0x8100` or `0x88a8`.
 *
 * @example Round-trip a tagged frame carrying an IPv4 payload
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { vlanTag, VLAN_TAG_SIZE } from "@binstruct/vlan";
 *
 * const coder = vlanTag();
 * const tag = {
 *   tci: { pcp: 5, dei: 0, vlanId: 100 },
 *   etherType: 0x0800,
 *   payload: new Uint8Array([0x45, 0x00, 0x00, 0x14]),
 * };
 *
 * const buffer = new Uint8Array(VLAN_TAG_SIZE + tag.payload.length);
 * const written = coder.encode(tag, buffer);
 * const [decoded, read] = coder.decode(buffer);
 *
 * assertEquals(written, read);
 * assertEquals(decoded.tci, tag.tci);
 * assertEquals(decoded.etherType, tag.etherType);
 * assertEquals(decoded.payload, tag.payload);
 * ```
 *
 * @module
 */

import { bitStruct, bytes, type Coder, struct, u16be } from "@hertzg/binstruct";

/**
 * EtherType assigned to IEEE 802.1Q tagged frames (`0x8100`). The value an
 * Ethernet II frame's `etherType` field carries when it is followed by a
 * VLAN tag rather than the payload's real EtherType.
 */
export const TPID_8021Q = 0x8100;

/**
 * Size in bytes of a VLAN tag: the 2-byte TCI (`pcp` + `dei` + `vlanId`)
 * plus the 2-byte encapsulated EtherType. Does not include the payload that
 * follows, which is variable-length.
 */
export const VLAN_TAG_SIZE = 4;

/**
 * Reserved `vlanId` meaning the frame carries no VLAN membership and the tag
 * is present only to carry `pcp` / `dei` ("priority-tagged" frame).
 */
export const VLAN_ID_PRIORITY_TAGGED = 0;

/**
 * Reserved `vlanId` indicating the tag carries implementation-specific
 * information rather than a VLAN membership. Never configured as a real
 * VLAN.
 */
export const VLAN_ID_RESERVED = 4095;

/**
 * Decoded IEEE 802.1Q VLAN tag — the TCI, the encapsulated EtherType, and
 * the raw payload that follows.
 *
 * @property tci            - Tag Control Information, the bit-packed 16-bit field.
 * @property tci.pcp        - Priority Code Point (0–7), a class-of-service value.
 * @property tci.dei        - Drop Eligible Indicator (0 or 1).
 * @property tci.vlanId     - VLAN Identifier (0–4095). See {@linkcode VLAN_ID_PRIORITY_TAGGED} and {@linkcode VLAN_ID_RESERVED}.
 * @property etherType      - EtherType of the encapsulated payload (e.g. `0x0800` for IPv4).
 * @property payload        - Frame payload; length is whatever remains of the input buffer.
 */
export interface VlanTag {
  tci: {
    pcp: number;
    dei: number;
    vlanId: number;
  };
  etherType: number;
  payload: Uint8Array;
}

/**
 * Creates a coder for an IEEE 802.1Q VLAN tag.
 *
 * Layout: 2-byte bit-packed TCI (`pcp`: 3 bits, `dei`: 1 bit, `vlanId`: 12
 * bits), 2-byte big-endian EtherType, then variable-length payload (default:
 * "rest of buffer").
 *
 * This coder does not consume or produce the `0x8100` TPID itself — only the
 * 4 bytes that follow it plus the payload. Compose it with
 * `@binstruct/ethernet`'s `ethernet2Frame` to parse a full tagged frame.
 *
 * @returns A `Coder<VlanTag>`.
 *
 * @example Decode known wire bytes for VID 100, priority 5
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { vlanTag } from "@binstruct/vlan";
 *
 * // deno-fmt-ignore
 * const wire = new Uint8Array([
 *   0xa0, 0x64,
 *   0x08, 0x00,
 *   0x45, 0x00, 0x00, 0x14,
 * ]);
 *
 * const [decoded, read] = vlanTag().decode(wire);
 *
 * assertEquals(read, wire.length);
 * assertEquals(decoded.tci, { pcp: 5, dei: 0, vlanId: 100 });
 * assertEquals(decoded.etherType, 0x0800);
 * assertEquals(decoded.payload, new Uint8Array([0x45, 0x00, 0x00, 0x14]));
 * ```
 */
export function vlanTag(): Coder<VlanTag> {
  return struct({
    tci: bitStruct({
      pcp: 3,
      dei: 1,
      vlanId: 12,
    }),
    etherType: u16be(),
    payload: bytes(),
  });
}
