/**
 * Reads the standard-time offset out of a POSIX `TZ` string.
 *
 * @module
 */

/**
 * Reads the standard-time UTC offset out of a POSIX `TZ` string.
 *
 * The result is ISO-style: positive east of UTC. POSIX writes the opposite
 * sign (the amount to add to local time to get UTC), so `CST-4:00:00`
 * gives `240` and `CST+3:00:00` gives `-180`. The offset may be `H`,
 * `H:MM` or `H:MM:SS`; seconds are ignored. Anything after the offset,
 * such as a DST rule, is ignored, so the result is always the standard-time
 * offset even while DST is in effect.
 *
 * @param timeZone The `<timeZone>` text, such as `EST+5EDT01:00:00,M3.2.0/02:00:00,M11.1.0/02:00:00`.
 * @returns The offset in minutes, or `undefined` when the string does not
 *   start with a zone name followed by an offset.
 *
 * @example Both signs, with and without DST
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseTimeZoneOffset } from "./parse-time-zone-offset.ts";
 *
 * assertEquals(parseTimeZoneOffset("CST-4:00:00"), 240);
 * assertEquals(parseTimeZoneOffset("CST+3:00:00"), -180);
 * assertEquals(
 *   parseTimeZoneOffset("EST+5EDT01:00:00,M3.2.0/02:00:00,M11.1.0/02:00:00"),
 *   -300,
 * );
 * assertEquals(parseTimeZoneOffset("UTC0"), 0);
 * assertEquals(parseTimeZoneOffset("Asia/Tbilisi"), undefined);
 * ```
 */
export function parseTimeZoneOffset(timeZone: string): number | undefined {
  // POSIX TZ: a zone name of letters, then [+-]H[:MM[:SS]], then an
  // optional DST name and rule that this reader does not need.
  const match = /^[A-Za-z]+([+-]?)(\d{1,2})(?::(\d{2}))?/.exec(timeZone);
  if (match === null) {
    return undefined;
  }
  const [, sign, hours, minutes = "0"] = match;
  const posix = Number(hours) * 60 + Number(minutes);
  return sign === "-" ? posix : -posix;
}
