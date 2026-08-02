/**
 * BFD (Bidirectional Forwarding Detection) control packet encoding and
 * decoding — mandatory section only (RFC 5880 section 4.1).
 *
 * A BFD control packet opens with a fixed 24-byte mandatory section. RFC 5880
 * also defines an optional authentication section that follows it when the
 * `authenticationPresent` flag is set, but this coder does not model it — see
 * "Scope" below.
 *
 * ```text
 *  0      7 8     15 16    23 24    31
 * +--------+--------+--------+--------+
 * |Ver/Diag| Flags  | DetMult| Length |
 * +--------+--------+--------+--------+
 * |                                   |
 * |          My Discriminator         |
 * +--------+--------+--------+--------+
 * |                                   |
 * |         Your Discriminator        |
 * +--------+--------+--------+--------+
 * |                                   |
 * |      Desired Min TX Interval      |
 * +--------+--------+--------+--------+
 * |                                   |
 * |      Required Min RX Interval     |
 * +--------+--------+--------+--------+
 * |                                   |
 * |   Required Min Echo RX Interval   |
 * +-----------------------------------+
 * ```
 *
 * The first byte packs a 3-bit `version` and 5-bit `diagnostic` code; the
 * second byte packs the 2-bit session `state` and five single-bit flags
 * (`poll`, `final`, `controlPlaneIndependent`, `authenticationPresent`,
 * `demand`, `multipoint` — six flags plus 2-bit state is 8 bits). Both bytes
 * are exposed as nested objects via `bitStruct`, keeping the on-wire layout
 * faithful while preserving named-field access.
 *
 * ## Scope (v0.0.1)
 *
 * This package covers only the 24-byte mandatory section:
 *
 * - No authentication section — when `flags.authenticationPresent` is set,
 *   the caller is responsible for the bytes that follow the mandatory
 *   section; this coder neither reads nor writes them.
 * - No checksum, no compression, no crypto — BFD control packets carry none
 *   of these, so there is nothing to add.
 * - Interval fields (`desiredMinTxInterval`, `requiredMinRxInterval`,
 *   `requiredMinEchoRxInterval`) are surfaced as raw microsecond counts, not
 *   refined into `Temporal`/`Duration` values — that conversion is left to
 *   the caller.
 *
 * @example Round-trip a BFD Up control packet
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { bfdControlPacket, BFD_CONTROL_SIZE, BFD_STATE } from "@binstruct/bfd";
 *
 * const coder = bfdControlPacket();
 * const packet = {
 *   versionDiagnostic: { version: 1, diagnostic: 0 },
 *   flags: {
 *     state: BFD_STATE.UP,
 *     poll: 0,
 *     final: 0,
 *     controlPlaneIndependent: 0,
 *     authenticationPresent: 0,
 *     demand: 0,
 *     multipoint: 0,
 *   },
 *   detectMultiplier: 3,
 *   length: BFD_CONTROL_SIZE,
 *   myDiscriminator: 0x11111111,
 *   yourDiscriminator: 0x22222222,
 *   desiredMinTxInterval: 1_000_000,
 *   requiredMinRxInterval: 1_000_000,
 *   requiredMinEchoRxInterval: 0,
 * };
 *
 * const buffer = new Uint8Array(BFD_CONTROL_SIZE);
 * const written = coder.encode(packet, buffer);
 * const [decoded, read] = coder.decode(buffer);
 *
 * assertEquals(written, BFD_CONTROL_SIZE);
 * assertEquals(read, BFD_CONTROL_SIZE);
 * assertEquals(decoded.flags.state, BFD_STATE.UP);
 * assertEquals(decoded.myDiscriminator, 0x11111111);
 * ```
 *
 * @module
 */

import { bitStruct, type Coder, struct, u32be, u8be } from "@hertzg/binstruct";

/**
 * Size in bytes of the BFD control packet mandatory section (RFC 5880
 * section 4.1). This coder does not model the optional authentication
 * section that may follow it.
 */
export const BFD_CONTROL_SIZE = 24;

/**
 * IANA-assigned UDP port for BFD control packets over IPv4 and IPv6 single
 * hops (RFC 5881 section 4).
 */
export const BFD_PORT = 3784;

/**
 * Session state values used by the `flags.state` field (RFC 5880 section
 * 4.1).
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { BFD_STATE } from "@binstruct/bfd";
 *
 * assertEquals(BFD_STATE.DOWN, 1);
 * assertEquals(BFD_STATE.UP, 3);
 * ```
 */
export const BFD_STATE = {
  /** Session is down and the remote system is not signaling. */
  ADMIN_DOWN: 0,
  /** Session is down. */
  DOWN: 1,
  /** Session is attempting to come up. */
  INIT: 2,
  /** Session is up and bidirectional connectivity is verified. */
  UP: 3,
} as const;

/**
 * Decoded BFD control packet mandatory section (RFC 5880 section 4.1).
 *
 * @property versionDiagnostic          - Protocol version and diagnostic code, packed into the first byte.
 * @property versionDiagnostic.version  - Protocol version. Always `1` for RFC 5880.
 * @property versionDiagnostic.diagnostic - Reason the session last changed state.
 * @property flags                              - Session state and single-bit flags, packed into the second byte.
 * @property flags.state                        - Session state. See {@linkcode BFD_STATE}.
 * @property flags.poll                         - Poll bit — sender requests a Poll Sequence.
 * @property flags.final                        - Final bit — response to a received Poll Sequence packet.
 * @property flags.controlPlaneIndependent      - Control Plane Independent — sender's BFD implementation does not share fate with its control plane.
 * @property flags.authenticationPresent        - Authentication Present — an authentication section follows the mandatory section. Not modeled by this coder; see module scope notes.
 * @property flags.demand                       - Demand mode — sender wishes to stop periodic transmission.
 * @property flags.multipoint                   - Multipoint — reserved for future point-to-multipoint use, always `0`.
 * @property detectMultiplier                   - Detection time multiplier; the negotiated detection time is `detectMultiplier * requiredMinRxInterval` on the receiving system.
 * @property length                              - Length of the BFD control packet, in bytes, including any authentication section.
 * @property myDiscriminator                     - Discriminator generated by the sender, unique across its sessions.
 * @property yourDiscriminator                   - Discriminator received from the remote system, or `0` if unknown.
 * @property desiredMinTxInterval                - Minimum interval, in microseconds, the sender would like to use when transmitting control packets.
 * @property requiredMinRxInterval                - Minimum interval, in microseconds, the sender can support receiving control packets.
 * @property requiredMinEchoRxInterval             - Minimum interval, in microseconds, the sender can support receiving echo packets, or `0` if the sender does not support the echo function.
 */
export interface BfdControlPacket {
  versionDiagnostic: {
    version: number;
    diagnostic: number;
  };
  flags: {
    state: number;
    poll: number;
    final: number;
    controlPlaneIndependent: number;
    authenticationPresent: number;
    demand: number;
    multipoint: number;
  };
  detectMultiplier: number;
  length: number;
  myDiscriminator: number;
  yourDiscriminator: number;
  desiredMinTxInterval: number;
  requiredMinRxInterval: number;
  requiredMinEchoRxInterval: number;
}

/**
 * Creates a coder for the mandatory section of a BFD control packet
 * (RFC 5880 section 4.1).
 *
 * Nothing is validated or computed on encode — `length`, discriminators, and
 * every interval are written exactly as given. When
 * `flags.authenticationPresent` is set, the caller owns everything from byte
 * {@linkcode BFD_CONTROL_SIZE} onward; this coder neither reads nor writes an
 * authentication section.
 *
 * @returns A coder for {@linkcode BfdControlPacket} values.
 *
 * @example Decode a known-wire Down packet, then re-encode it
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { bfdControlPacket, BFD_CONTROL_SIZE, BFD_STATE } from "@binstruct/bfd";
 *
 * const coder = bfdControlPacket();
 * // deno-fmt-ignore
 * const wire = new Uint8Array([
 *   0x20, 0x50, 0x03, 0x18,
 *   0x00, 0x00, 0x00, 0x01,
 *   0x00, 0x00, 0x00, 0x00,
 *   0x00, 0x0f, 0x42, 0x40,
 *   0x00, 0x0f, 0x42, 0x40,
 *   0x00, 0x00, 0x00, 0x00,
 * ]);
 *
 * const [decoded, read] = coder.decode(wire);
 *
 * assertEquals(read, BFD_CONTROL_SIZE);
 * assertEquals(decoded.versionDiagnostic.version, 1);
 * assertEquals(decoded.flags.state, BFD_STATE.DOWN);
 * assertEquals(decoded.flags.final, 1);
 * assertEquals(decoded.myDiscriminator, 1);
 * assertEquals(decoded.desiredMinTxInterval, 1_000_000);
 *
 * const buffer = new Uint8Array(BFD_CONTROL_SIZE);
 * const written = coder.encode(decoded, buffer);
 *
 * assertEquals(written, BFD_CONTROL_SIZE);
 * assertEquals(buffer, wire);
 * ```
 */
export function bfdControlPacket(): Coder<BfdControlPacket> {
  return struct({
    versionDiagnostic: bitStruct({
      version: 3,
      diagnostic: 5,
    }),
    flags: bitStruct({
      state: 2,
      poll: 1,
      final: 1,
      controlPlaneIndependent: 1,
      authenticationPresent: 1,
      demand: 1,
      multipoint: 1,
    }),
    detectMultiplier: u8be(),
    length: u8be(),
    myDiscriminator: u32be(),
    yourDiscriminator: u32be(),
    desiredMinTxInterval: u32be(),
    requiredMinRxInterval: u32be(),
    requiredMinEchoRxInterval: u32be(),
  });
}
