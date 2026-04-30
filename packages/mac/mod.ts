/**
 * EUI-48 MAC address parsing and stringification.
 *
 * Sister package to {@link https://jsr.io/@hertzg/ip @hertzg/ip} — same shape,
 * single concern: convert between the canonical 17-character text form
 * (`aa:bb:cc:dd:ee:ff` or `AA-BB-CC-DD-EE-FF`) and the 6-byte binary form.
 *
 * @example Round-trip
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseMac, stringifyMac } from "@hertzg/mac";
 *
 * const bytes = parseMac("AA:BB:CC:DD:EE:FF");
 * assertEquals(bytes, new Uint8Array([0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff]));
 * assertEquals(stringifyMac(bytes), "aa:bb:cc:dd:ee:ff");
 * ```
 *
 * @module @hertzg/mac
 */

/** Length of an EUI-48 MAC address in bytes. */
export const MAC_BYTE_LENGTH = 6;

/**
 * Parses a canonical EUI-48 MAC address string into its 6-byte binary form.
 *
 * Accepts colon (`aa:bb:cc:dd:ee:ff`) or hyphen (`aa-bb-cc-dd-ee-ff`)
 * delimiters. Hex digits are case-insensitive. Each octet must be exactly two
 * hex characters — no leading-zero tricks, no abbreviations.
 *
 * @param mac MAC address in canonical text form.
 * @returns 6-byte `Uint8Array` containing the address octets.
 * @throws {TypeError} when the input is not 6 octets, the delimiter is mixed,
 *   an octet is not exactly two hex characters, or any character is not hex.
 *
 * @example Colon-delimited
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseMac } from "@hertzg/mac";
 *
 * assertEquals(
 *   parseMac("00:11:22:33:44:55"),
 *   new Uint8Array([0x00, 0x11, 0x22, 0x33, 0x44, 0x55]),
 * );
 * ```
 *
 * @example Hyphen-delimited (IEEE form)
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseMac } from "@hertzg/mac";
 *
 * assertEquals(
 *   parseMac("AA-BB-CC-DD-EE-FF"),
 *   new Uint8Array([0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff]),
 * );
 * ```
 *
 * @example Rejects malformed input
 * ```ts
 * import { assertThrows } from "@std/assert";
 * import { parseMac } from "@hertzg/mac";
 *
 * assertThrows(() => parseMac("aa:bb:cc:dd:ee"), TypeError);
 * assertThrows(() => parseMac("aa:bb:cc:dd:ee:ff:00"), TypeError);
 * assertThrows(() => parseMac("aa:bb:cc:dd:ee:gg"), TypeError);
 * assertThrows(() => parseMac("aabbccddeeff"), TypeError);
 * assertThrows(() => parseMac("a:bb:cc:dd:ee:ff"), TypeError);
 * ```
 */
export function parseMac(mac: string): Uint8Array {
  const delimiter = mac.includes(":") ? ":" : "-";
  const parts = mac.split(delimiter);

  if (parts.length !== MAC_BYTE_LENGTH) {
    throw new TypeError(
      `MAC address must have exactly ${MAC_BYTE_LENGTH} octets, got ${parts.length}`,
    );
  }

  const bytes = new Uint8Array(MAC_BYTE_LENGTH);

  for (let i = 0; i < MAC_BYTE_LENGTH; i++) {
    const part = parts[i];

    if (part.length !== 2 || !/^[0-9a-fA-F]{2}$/.test(part)) {
      throw new TypeError(
        `MAC address octet must be exactly two hex characters, got "${part}"`,
      );
    }

    bytes[i] = parseInt(part, 16);
  }

  return bytes;
}

/**
 * Formats a 6-byte EUI-48 MAC address as a lowercase hex string.
 *
 * Produces the canonical colon-delimited form (`aa:bb:cc:dd:ee:ff`) by
 * default. Pass `"-"` for the hyphenated IEEE form.
 *
 * @param bytes 6-byte MAC address.
 * @param delimiter Octet delimiter — `":"` (default) or `"-"`.
 * @returns Lowercase hex MAC string.
 * @throws {TypeError} when `bytes.length !== 6`.
 *
 * @example Default (colon)
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { stringifyMac } from "@hertzg/mac";
 *
 * assertEquals(
 *   stringifyMac(new Uint8Array([0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff])),
 *   "aa:bb:cc:dd:ee:ff",
 * );
 * ```
 *
 * @example Hyphen
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { stringifyMac } from "@hertzg/mac";
 *
 * assertEquals(
 *   stringifyMac(new Uint8Array([0x00, 0x11, 0x22, 0x33, 0x44, 0x55]), "-"),
 *   "00-11-22-33-44-55",
 * );
 * ```
 */
export function stringifyMac(
  bytes: Uint8Array,
  delimiter: ":" | "-" = ":",
): string {
  if (bytes.length !== MAC_BYTE_LENGTH) {
    throw new TypeError(
      `MAC address must be exactly ${MAC_BYTE_LENGTH} bytes, got ${bytes.length}`,
    );
  }

  let result = "";
  for (let i = 0; i < MAC_BYTE_LENGTH; i++) {
    if (i > 0) result += delimiter;
    result += bytes[i].toString(16).padStart(2, "0");
  }
  return result;
}
