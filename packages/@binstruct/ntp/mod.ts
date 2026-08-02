/**
 * NTPv4 packet header encoding and decoding (RFC 5905).
 *
 * An NTP packet opens with a fixed 48-byte header. This coder covers that
 * header only — the optional extension fields and MAC that can follow it are
 * out of scope for v0.0.1:
 *
 * ```text
 *  0                   1                   2                   3
 *  0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * |LI | VN  |Mode |    Stratum    |     Poll      |   Precision   |
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * |                          Root Delay                          |
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * |                       Root Dispersion                        |
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * |                          Reference ID                        |
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * |                                                               |
 * +                     Reference Timestamp (64)                 +
 * |                                                               |
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * |                                                               |
 * +                      Origin Timestamp (64)                   +
 * |                                                               |
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * |                                                               |
 * +                      Receive Timestamp (64)                  +
 * |                                                               |
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * |                                                               |
 * +                     Transmit Timestamp (64)                  +
 * |                                                               |
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * ```
 *
 * `leapIndicator`, `version` and `mode` share the first byte, MSB-first, and
 * are exposed as a nested object via `bitStruct`. Everything else is
 * byte-aligned.
 *
 * `poll` and `precision` are signed 8-bit integers (`s8be`) per RFC 5905 —
 * both are exponents of 2 (seconds), and `precision` in particular is
 * routinely negative (e.g. -20 for a microsecond-precision clock).
 * `@hertzg/binstruct` does export a signed 8-bit coder, so no `u8be`
 * workaround is needed here.
 *
 * `rootDelay` and `rootDispersion` are, per the RFC, 32-bit signed fixed-point
 * numbers (16.16). This v0.0.1 coder surfaces them as raw `u32be` integers —
 * the same "no semantic interpretation" stance `@binstruct/ipv4` takes with
 * its header checksum. Fixed-point conversion is left to the caller.
 *
 * The four timestamp fields (`referenceTimestamp`, `originTimestamp`,
 * `receiveTimestamp`, `transmitTimestamp`) are NTP era/second/fraction
 * 64-bit values, surfaced here as raw big-endian `bigint`s (via `u64be`).
 * Converting the 32-bit seconds-since-1900 high half and 32-bit fraction low
 * half to a JavaScript `Date` (or handling the 2036 rollover) is out of scope
 * for v0.0.1 and left to the caller.
 *
 * @example Round-trip a client request packet
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { ntpPacket, NTP_MODE, NTP_PACKET_SIZE } from "@binstruct/ntp";
 *
 * const coder = ntpPacket();
 * const packet = {
 *   leapVersionMode: { leapIndicator: 0, version: 4, mode: NTP_MODE.CLIENT },
 *   stratum: 0,
 *   poll: 4,
 *   precision: -20,
 *   rootDelay: 0,
 *   rootDispersion: 0,
 *   referenceId: 0,
 *   referenceTimestamp: 0n,
 *   originTimestamp: 0n,
 *   receiveTimestamp: 0n,
 *   transmitTimestamp: 0xe4c5c46700000000n,
 * };
 *
 * const buffer = new Uint8Array(NTP_PACKET_SIZE);
 * const written = coder.encode(packet, buffer);
 * const [decoded, read] = coder.decode(buffer);
 *
 * assertEquals(written, NTP_PACKET_SIZE);
 * assertEquals(read, NTP_PACKET_SIZE);
 * assertEquals(decoded, packet);
 * assertEquals(decoded.leapVersionMode.mode, NTP_MODE.CLIENT);
 * ```
 *
 * @module
 */

import {
  bitStruct,
  type Coder,
  s8be,
  struct,
  u32be,
  u64be,
  u8be,
} from "@hertzg/binstruct";

/**
 * Size in bytes of a fixed NTPv4 header, before any extension fields or MAC.
 */
export const NTP_PACKET_SIZE = 48;

/**
 * The IANA-assigned UDP (and TCP) port for the Network Time Protocol.
 */
export const NTP_PORT = 123;

/**
 * `mode` values carried in the first byte of an NTP header (RFC 5905 §7.3).
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { NTP_MODE } from "@binstruct/ntp";
 *
 * assertEquals(NTP_MODE.CLIENT, 3);
 * assertEquals(NTP_MODE.SERVER, 4);
 * assertEquals(NTP_MODE.BROADCAST, 5);
 * ```
 */
export const NTP_MODE = {
  /** Reserved. */
  RESERVED: 0,
  /** Symmetric active. */
  SYMMETRIC_ACTIVE: 1,
  /** Symmetric passive. */
  SYMMETRIC_PASSIVE: 2,
  /** Client. */
  CLIENT: 3,
  /** Server. */
  SERVER: 4,
  /** Broadcast. */
  BROADCAST: 5,
  /** NTP control message. */
  CONTROL: 6,
  /** Reserved for private use. */
  PRIVATE: 7,
} as const;

/**
 * `leapIndicator` values carried in the first byte of an NTP header
 * (RFC 5905 §7.3), warning of an impending leap second.
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { NTP_LEAP_INDICATOR } from "@binstruct/ntp";
 *
 * assertEquals(NTP_LEAP_INDICATOR.NO_WARNING, 0);
 * assertEquals(NTP_LEAP_INDICATOR.UNSYNCHRONIZED, 3);
 * ```
 */
export const NTP_LEAP_INDICATOR = {
  /** No leap second warning. */
  NO_WARNING: 0,
  /** Last minute of the day has 61 seconds. */
  LAST_MINUTE_61: 1,
  /** Last minute of the day has 59 seconds. */
  LAST_MINUTE_59: 2,
  /** Clock unsynchronized. */
  UNSYNCHRONIZED: 3,
} as const;

/**
 * Decoded NTPv4 packet header (RFC 5905).
 *
 * @property leapVersionMode         - The shared first byte: leap second warning, protocol version, and association mode.
 * @property leapVersionMode.leapIndicator - Leap second warning. See {@linkcode NTP_LEAP_INDICATOR}.
 * @property leapVersionMode.version       - NTP protocol version. `4` for NTPv4.
 * @property leapVersionMode.mode          - Association mode. See {@linkcode NTP_MODE}.
 * @property stratum                 - Distance from the reference clock; `0` unspecified, `1` primary, `2`-`15` secondary.
 * @property poll                    - Maximum polling interval, as a signed exponent of 2 in seconds.
 * @property precision               - Clock precision, as a signed exponent of 2 in seconds.
 * @property rootDelay               - Round-trip delay to the primary reference source. Raw 32-bit value; RFC 5905 defines it as a 16.16 fixed-point seconds count.
 * @property rootDispersion          - Nominal error relative to the primary reference source. Raw 32-bit value; RFC 5905 defines it as a 16.16 fixed-point seconds count.
 * @property referenceId             - Reference identifier: a 4-byte ASCII code (stratum 0/1) or the low 32 bits of the reference source's address (stratum ≥ 2).
 * @property referenceTimestamp      - Time the local clock was last set or corrected. Raw 64-bit NTP timestamp; no epoch conversion applied.
 * @property originTimestamp         - Time the request departed the client. Raw 64-bit NTP timestamp; no epoch conversion applied.
 * @property receiveTimestamp        - Time the request arrived at the server. Raw 64-bit NTP timestamp; no epoch conversion applied.
 * @property transmitTimestamp       - Time the reply departed the server. Raw 64-bit NTP timestamp; no epoch conversion applied.
 */
export interface NtpPacket {
  leapVersionMode: {
    leapIndicator: number;
    version: number;
    mode: number;
  };
  stratum: number;
  poll: number;
  precision: number;
  rootDelay: number;
  rootDispersion: number;
  referenceId: number;
  referenceTimestamp: bigint;
  originTimestamp: bigint;
  receiveTimestamp: bigint;
  transmitTimestamp: bigint;
}

/**
 * Creates a coder for a fixed 48-byte NTPv4 packet header.
 *
 * Covers the header only — extension fields and the optional MAC that can
 * trail an authenticated packet are not part of this coder; use `bytes()`
 * with a caller-supplied length to capture them separately.
 *
 * @returns A coder for {@linkcode NtpPacket} values.
 *
 * @example Decode a known server response
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { ntpPacket, NTP_MODE, NTP_PACKET_SIZE } from "@binstruct/ntp";
 *
 * // deno-fmt-ignore
 * const wire = new Uint8Array([
 *   0x24,                   // LI=0 VN=4 Mode=4 (server)
 *   0x01,                   // stratum = 1 (primary reference)
 *   0x04,                   // poll = 4
 *   0xec,                   // precision = -20
 *   0x00, 0x00, 0x00, 0x00, // rootDelay = 0
 *   0x00, 0x00, 0x00, 0x0a, // rootDispersion = 10
 *   0x47, 0x50, 0x53, 0x00, // referenceId = "GPS\0"
 *   0xe4, 0xc5, 0xc4, 0x60, 0x00, 0x00, 0x00, 0x00, // referenceTimestamp
 *   0xe4, 0xc5, 0xc4, 0x67, 0x00, 0x00, 0x00, 0x00, // originTimestamp
 *   0xe4, 0xc5, 0xc4, 0x67, 0x00, 0x00, 0x00, 0x00, // receiveTimestamp
 *   0xe4, 0xc5, 0xc4, 0x67, 0x80, 0x00, 0x00, 0x00, // transmitTimestamp
 * ]);
 *
 * const [decoded, read] = ntpPacket().decode(wire);
 *
 * assertEquals(read, NTP_PACKET_SIZE);
 * assertEquals(decoded.leapVersionMode.version, 4);
 * assertEquals(decoded.leapVersionMode.mode, NTP_MODE.SERVER);
 * assertEquals(decoded.stratum, 1);
 * assertEquals(decoded.precision, -20);
 * assertEquals(decoded.rootDispersion, 10);
 * assertEquals(decoded.referenceId, 0x47505300);
 * assertEquals(decoded.transmitTimestamp, 0xe4c5c46780000000n);
 * ```
 */
export function ntpPacket(): Coder<NtpPacket> {
  return struct({
    leapVersionMode: bitStruct({
      leapIndicator: 2,
      version: 3,
      mode: 3,
    }),
    stratum: u8be(),
    poll: s8be(),
    precision: s8be(),
    rootDelay: u32be(),
    rootDispersion: u32be(),
    referenceId: u32be(),
    referenceTimestamp: u64be(),
    originTimestamp: u64be(),
    receiveTimestamp: u64be(),
    transmitTimestamp: u64be(),
  });
}
