/**
 * IPv4 packet header encoding and decoding utilities (RFC 791).
 *
 * Provides a single-pass coder for the 20-byte fixed portion of an IPv4 header
 * plus its variable-length options trailer. Bit-packed fields (version/IHL,
 * flags/fragment offset) are exposed as nested objects via {@link bitStruct},
 * keeping the on-wire layout faithful while preserving named-field access.
 *
 * IPv4 addresses are surfaced as dotted-quad strings via a refiner backed by
 * `parseIpv4`/`stringifyIpv4` from
 * {@link https://jsr.io/@hertzg/ip @hertzg/ip}.
 *
 * Design notes:
 *
 * - The header checksum is **not** computed automatically. Callers are expected
 *   to set the `headerChecksum` field to a valid RFC 1071 16-bit one's
 *   complement sum before encoding (or zero when the receiver tolerates it,
 *   e.g. for testing). This matches the `@hertzg/binstruct` "no defensive
 *   programming" stance — the coder describes layout, not semantics.
 * - Options are encoded as a raw byte slice whose length is derived from
 *   `versionIhl.ihl` via {@link computedRef}: `(ihl - 5) * 4`. For a header
 *   with no options pass `ihl = 5` and `options = new Uint8Array(0)`.
 * - Padding to a 4-byte boundary inside the options field is the caller's
 *   responsibility, again matching the layout-not-semantics philosophy.
 *
 * @example Round-trip a minimal IPv4 header (no options)
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { ipv4Header } from "@binstruct/ipv4";
 *
 * const coder = ipv4Header();
 * const header = {
 *   versionIhl: { version: 4, ihl: 5 },
 *   typeOfService: 0,
 *   totalLength: 40,
 *   identification: 0x1234,
 *   flagsFragmentOffset: {
 *     reserved: 0,
 *     dontFragment: 1,
 *     moreFragments: 0,
 *     fragmentOffset: 0,
 *   },
 *   timeToLive: 64,
 *   protocol: 6,
 *   headerChecksum: 0,
 *   sourceAddress: "192.168.1.100",
 *   destinationAddress: "10.0.0.50",
 *   options: new Uint8Array(0),
 * };
 *
 * const buffer = new Uint8Array(20);
 * const bytesWritten = coder.encode(header, buffer);
 * const [decoded, bytesRead] = coder.decode(buffer);
 *
 * assertEquals(bytesWritten, 20);
 * assertEquals(bytesRead, 20);
 * assertEquals(decoded.sourceAddress, "192.168.1.100");
 * assertEquals(decoded.destinationAddress, "10.0.0.50");
 * assertEquals(decoded.flagsFragmentOffset.dontFragment, 1);
 * ```
 *
 * @module
 */

import {
  bitStruct,
  bytes,
  type Coder,
  computedRef,
  ref,
  refine,
  struct,
  u16be,
  u32be,
  u8be,
} from "@hertzg/binstruct";
import { parseIpv4, stringifyIpv4 } from "@hertzg/ip";

/**
 * Bit-packed version (4 bits) and IHL (4 bits) field, byte 0 of the header.
 *
 * `version` is always `4` for IPv4. `ihl` is the Internet Header Length in
 * 32-bit words; it equals `5` when no options are present and ranges up to
 * `15` (60 bytes total).
 */
export type Ipv4VersionIhl = {
  version: number;
  ihl: number;
};

/**
 * Bit-packed flags (3 bits) and fragment offset (13 bits), bytes 6-7.
 *
 * `reserved` must be zero per RFC 791 §3.1 but is exposed so the coder can
 * round-trip captured packets verbatim. `dontFragment` (DF) and
 * `moreFragments` (MF) are 1-bit flags. `fragmentOffset` counts 8-byte units.
 */
export type Ipv4FlagsFragmentOffset = {
  reserved: number;
  dontFragment: number;
  moreFragments: number;
  fragmentOffset: number;
};

/**
 * Decoded IPv4 packet header (RFC 791).
 *
 * IPv4 addresses are surfaced as dotted-quad strings (e.g. `"192.168.1.1"`).
 * The `options` field is the raw byte slice whose length is derived from
 * `versionIhl.ihl` (`(ihl - 5) * 4` bytes); pass an empty array when
 * `ihl === 5`.
 */
export type Ipv4Header = {
  versionIhl: Ipv4VersionIhl;
  typeOfService: number;
  totalLength: number;
  identification: number;
  flagsFragmentOffset: Ipv4FlagsFragmentOffset;
  timeToLive: number;
  protocol: number;
  headerChecksum: number;
  sourceAddress: string;
  destinationAddress: string;
  options: Uint8Array;
};

const ipv4Address = refine(u32be(), {
  refine: (raw: number): string => stringifyIpv4(raw),
  unrefine: (formatted: string): number => parseIpv4(formatted),
});

/**
 * Creates a coder for IPv4 packet headers (RFC 791).
 *
 * The returned coder handles the 20-byte fixed header plus a variable-length
 * options trailer whose size is derived from `versionIhl.ihl`:
 * `(ihl - 5) * 4` bytes. With `ihl === 5` the options field is empty and the
 * encoded header is exactly 20 bytes.
 *
 * The header checksum is treated as an opaque field — callers are responsible
 * for computing and supplying a valid RFC 1071 sum before encoding.
 *
 * @returns A coder that encodes/decodes {@link Ipv4Header} values.
 *
 * @example Encode and decode a header with two 4-byte option words
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { ipv4Header } from "@binstruct/ipv4";
 *
 * const coder = ipv4Header();
 * // deno-fmt-ignore
 * const optionBytes = new Uint8Array([
 *   0x07, 0x07, 0x04, 0x00,
 *   0x00, 0x00, 0x00, 0x00,
 * ]);
 *
 * const header = {
 *   versionIhl: { version: 4, ihl: 7 },
 *   typeOfService: 0,
 *   totalLength: 28,
 *   identification: 0xabcd,
 *   flagsFragmentOffset: {
 *     reserved: 0,
 *     dontFragment: 0,
 *     moreFragments: 0,
 *     fragmentOffset: 0,
 *   },
 *   timeToLive: 32,
 *   protocol: 17,
 *   headerChecksum: 0,
 *   sourceAddress: "10.0.0.1",
 *   destinationAddress: "10.0.0.2",
 *   options: optionBytes,
 * };
 *
 * const buffer = new Uint8Array(28);
 * const bytesWritten = coder.encode(header, buffer);
 * const [decoded, bytesRead] = coder.decode(buffer);
 *
 * assertEquals(bytesWritten, 28);
 * assertEquals(bytesRead, 28);
 * assertEquals(decoded.versionIhl.ihl, 7);
 * assertEquals(decoded.options.length, 8);
 * assertEquals(Array.from(decoded.options), Array.from(optionBytes));
 * ```
 */
export function ipv4Header(): Coder<Ipv4Header> {
  const versionIhl = bitStruct({
    version: 4,
    ihl: 4,
  });

  const flagsFragmentOffset = bitStruct({
    reserved: 1,
    dontFragment: 1,
    moreFragments: 1,
    fragmentOffset: 13,
  });

  const optionsLength = computedRef(
    [ref(versionIhl)],
    (vi) => (vi.ihl - 5) * 4,
  );

  return struct({
    versionIhl,
    typeOfService: u8be(),
    totalLength: u16be(),
    identification: u16be(),
    flagsFragmentOffset,
    timeToLive: u8be(),
    protocol: u8be(),
    headerChecksum: u16be(),
    sourceAddress: ipv4Address(),
    destinationAddress: ipv4Address(),
    options: bytes(optionsLength),
  }) as Coder<Ipv4Header>;
}
