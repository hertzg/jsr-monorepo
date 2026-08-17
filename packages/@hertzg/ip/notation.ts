/**
 * The structural layer of IP notation: splitting a string into its
 * address, zone ID and prefix slots without reading any of them.
 *
 * Every parser in this package is a narrowing of one grammar (ADR 0003):
 *
 * ```
 * notation = address [ "%" zoneId ] [ "/" prefix ]
 * ```
 *
 * {@link splitNotation} is the first of three layers. It knows nothing
 * about IP: it does not know what a colon or a dot means, only that `%`
 * and `/` are delimiters, that each occurs at most once, that the zone
 * comes before the prefix (RFC 4007 section 11.7), and that no slot is
 * empty. Everything else -- whether the address is IPv4 or IPv6, whether
 * the prefix is a length or a mask, whether the zone is well-formed -- is
 * decided by the parser that called it.
 *
 * @example Splitting the three slots
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { splitNotation } from "@hertzg/ip/notation";
 *
 * assertEquals(splitNotation("fe80::%ether1/64"), {
 *   address: "fe80::",
 *   zoneId: "ether1",
 *   prefix: "64",
 * });
 * assertEquals(splitNotation("10.0.0.0/255.0.0.0"), {
 *   address: "10.0.0.0",
 *   prefix: "255.0.0.0",
 * });
 * assertEquals(splitNotation("192.168.1.1%ether1"), {
 *   address: "192.168.1.1",
 *   zoneId: "ether1",
 * });
 * ```
 *
 * @module
 */

/**
 * The zone ID of an address, the interface tail after `%` in
 * `fe80::1%eth0` (RFC 4007 section 11). Carried verbatim by the `Parsed*`
 * types; never percent-decoded, so `%25eth0` is the zone `25eth0`.
 */
export type ZoneId = string;

/**
 * The three slots of an IP notation string, as slices of it, before any of
 * them is read. Absent slots are absent, not empty: {@link splitNotation}
 * rejects an empty slot rather than returning `""`.
 */
export type Notation = {
  /** The address slot, everything before the first `%` or `/` */
  readonly address: string;
  /** The zone ID slot, between `%` and the `/` or the end of the string */
  readonly zoneId?: ZoneId;
  /** The prefix slot, everything after `/`: a prefix length or a mask */
  readonly prefix?: string;
};

/** Character codes the slot scanner compares against. */
const CHAR_PERCENT = 0x25;
const CHAR_SLASH = 0x2f;

/**
 * Splits an IP notation string into its address, zone ID and prefix slots.
 *
 * One pass over the string records where `%` and `/` are, then slices.
 * Nothing about IP is checked here; the parsers that call this do that on
 * the slices. Exactly five shapes are rejected, all `TypeError`:
 *
 * - `%` more than once: `fe80::1%eth0%1`
 * - `/` more than once: `10.0.0.0/8/8`
 * - `%` after `/`: `10.0.0.0/8%eth0` (RFC 4007 section 11.7 puts the zone first)
 * - an empty address: `%eth0`, `/64`
 * - an empty zone ID or prefix: `fe80::1%`, `10.0.0.0/`
 *
 * Because no slot may contain `%` or `/`, both positions are unique, and
 * the zone slice ends at the `/` rather than running to the end of the
 * string. `fe80::1%eth0/64` is therefore the zone `eth0` with the prefix
 * `64`; there is no greedy reading to get wrong.
 *
 * @param notation The notation string
 * @returns The three slots as slices; `zoneId` and `prefix` are present
 *   only when the string has them
 * @throws {TypeError} On any of the five shapes above
 *
 * @example An address alone
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { splitNotation } from "@hertzg/ip/notation";
 *
 * assertEquals(splitNotation("192.168.1.1"), { address: "192.168.1.1" });
 * assertEquals(splitNotation("fe80::1"), { address: "fe80::1" });
 * ```
 *
 * @example The zone slice stops at the slash
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { splitNotation } from "@hertzg/ip/notation";
 *
 * assertEquals(splitNotation("fe80::1%eth0/64"), {
 *   address: "fe80::1",
 *   zoneId: "eth0",
 *   prefix: "64",
 * });
 * assertEquals(splitNotation("fe80::1%eth0.100"), {
 *   address: "fe80::1",
 *   zoneId: "eth0.100",
 * });
 * ```
 *
 * @example The five rejected shapes
 * ```ts
 * import { assertThrows } from "@std/assert";
 * import { splitNotation } from "@hertzg/ip/notation";
 *
 * assertThrows(() => splitNotation("fe80::1%eth0%1"), TypeError);
 * assertThrows(() => splitNotation("10.0.0.0/8/8"), TypeError);
 * assertThrows(() => splitNotation("10.0.0.0/8%eth0"), TypeError);
 * assertThrows(() => splitNotation("%eth0"), TypeError);
 * assertThrows(() => splitNotation("fe80::1%"), TypeError);
 * assertThrows(() => splitNotation("10.0.0.0/"), TypeError);
 * ```
 */
export function splitNotation(notation: string): Notation {
  const length = notation.length;
  let percent = -1;
  let slash = -1;

  for (let index = 0; index < length; index++) {
    const code = notation.charCodeAt(index);
    if (code === CHAR_PERCENT) {
      if (percent !== -1) {
        throw new TypeError(
          `Notation must contain '%' at most once, got '${notation}'`,
        );
      }
      percent = index;
    } else if (code === CHAR_SLASH) {
      if (slash !== -1) {
        throw new TypeError(
          `Notation must contain '/' at most once, got '${notation}'`,
        );
      }
      slash = index;
    }
  }

  if (percent !== -1 && slash !== -1 && percent > slash) {
    throw new TypeError(
      `Zone ID must precede the prefix, got '${notation}'`,
    );
  }

  const addressEnd = percent !== -1 ? percent : slash !== -1 ? slash : length;
  if (addressEnd === 0) {
    throw new TypeError(
      `Notation must start with an address, got '${notation}'`,
    );
  }

  const slots: { -readonly [K in keyof Notation]: Notation[K] } = {
    address: notation.slice(0, addressEnd),
  };

  if (percent !== -1) {
    const zoneEnd = slash !== -1 ? slash : length;
    if (zoneEnd === percent + 1) {
      throw new TypeError(`Zone ID must not be empty, got '${notation}'`);
    }
    slots.zoneId = notation.slice(percent + 1, zoneEnd);
  }

  if (slash !== -1) {
    if (slash === length - 1) {
      throw new TypeError(`Prefix must not be empty, got '${notation}'`);
    }
    slots.prefix = notation.slice(slash + 1);
  }

  return slots;
}
