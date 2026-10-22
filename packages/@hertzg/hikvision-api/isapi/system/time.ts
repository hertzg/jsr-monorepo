/**
 * `/ISAPI/System/time`: the device clock and its time zone.
 *
 * ```xml
 * <Time version="1.0" xmlns="http://www.hikvision.com/ver20/XMLSchema">
 * <timeMode>NTP</timeMode>
 * <localTime>2026-10-22T11:33:52+04:00</localTime>
 * <timeZone>CST-4:00:00</timeZone>
 * </Time>
 * ```
 *
 * `<timeZone>` is a POSIX 1003.1 `TZ` string, whose sign is the reverse
 * of ISO 8601: the number after the zone name is what you add to local
 * time to reach UTC, so `CST-4:00:00` is UTC+4 and `CST+3:00:00` is UTC-3.
 * {@link parseTimeZoneOffset} turns it into an ISO-style offset in minutes,
 * which the parsed document carries as `utcOffsetMinutes`.
 *
 * @example Parse a time document
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { deviceTime } from "./time.ts";
 *
 * const time = deviceTime.codec.parse(
 *   "<Time><timeMode>NTP</timeMode>" +
 *     "<localTime>2026-10-22T11:33:52+04:00</localTime>" +
 *     "<timeZone>CST-4:00:00</timeZone></Time>",
 * );
 *
 * assertEquals(time, {
 *   timeMode: "NTP",
 *   localTime: "2026-10-22T11:33:52+04:00",
 *   timeZone: "CST-4:00:00",
 *   utcOffsetMinutes: 240,
 * });
 * ```
 *
 * @module
 */

import { document, optional, text } from "../document.ts";
import type { Resource } from "../request.ts";

/** The fields of `<Time>`. */
export type DeviceTime = {
  /**
   * `<timeMode>`: where the clock comes from. `NTP`, `manual`, `local`,
   * `satellite` or `timecorrect`; an NVR enrolled with a cloud platform
   * reports `platform`.
   */
  timeMode: string;
  /**
   * `<localTime>`: the device clock as ISO 8601 text, such as
   * `2026-10-22T11:33:52+04:00`. Some firmware leaves the offset out.
   */
  localTime: string;
  /** `<timeZone>`: a POSIX `TZ` string such as `CST-4:00:00`. */
  timeZone: string;
  /**
   * The standard-time UTC offset of `timeZone` in minutes, ISO-style:
   * `CST-4:00:00` gives `240`. Absent when `timeZone` does not parse.
   */
  utcOffsetMinutes?: number;
  /** `<platformType>`, such as `EZVIZ`, when `timeMode` is `platform`. */
  platformType?: string;
};

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
 * import { parseTimeZoneOffset } from "./time.ts";
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

/**
 * The device time resource, `/ISAPI/System/time`.
 *
 * `utcOffsetMinutes` is set when `timeZone` parses; `platformType` when the
 * device sends it. Parsing throws an `Error` when `timeMode`, `localTime` or
 * `timeZone` is missing and an `IsapiError` on a failing `<ResponseStatus>`.
 *
 * @example Read through a stubbed fetch
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { resolvesNext, spy } from "@std/testing/mock";
 * import { request } from "../request.ts";
 * import { deviceTime } from "./time.ts";
 *
 * const fetch = spy(resolvesNext([
 *   new Response(
 *     "<Time><timeMode>platform</timeMode><platformType>EZVIZ</platformType>" +
 *       "<localTime>2026-10-22T11:33:52</localTime>" +
 *       "<timeZone>CST+3:00:00</timeZone></Time>",
 *   ),
 * ]));
 *
 * const time = await request({
 *   baseUrl: "http://192.0.2.21",
 *   username: "admin",
 *   password: "hunter2",
 *   fetch,
 * }, deviceTime);
 *
 * assertEquals(time.platformType, "EZVIZ");
 * assertEquals(time.utcOffsetMinutes, -180);
 * assertEquals(fetch.calls[0].args[0], "http://192.0.2.21/ISAPI/System/time");
 * ```
 */
export const deviceTime: Resource<DeviceTime> = {
  path: "/ISAPI/System/time",
  codec: document({
    timeMode: text(),
    localTime: text(),
    timeZone: text(),
    platformType: optional(text()),
  }).map(toDeviceTime),
};

function toDeviceTime(fields: DeviceTime): DeviceTime {
  const utcOffsetMinutes = parseTimeZoneOffset(fields.timeZone);
  return utcOffsetMinutes === undefined
    ? fields
    : { ...fields, utcOffsetMinutes };
}
