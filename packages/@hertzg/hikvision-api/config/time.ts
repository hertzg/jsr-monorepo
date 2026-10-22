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
 * `<timeZone>` is a POSIX 1003.1 `TZ` string, and POSIX puts the sign the
 * other way round from ISO 8601: the number after the zone name is what
 * you add to local time to reach UTC. So `CST-4:00:00` is UTC+4 and
 * `CST+3:00:00` is UTC-3. {@link parseTimeZoneOffset} turns the string into
 * the ISO-style offset in minutes, and `utcOffsetMinutes` carries it on the
 * parsed document.
 *
 * @example Parse a time document
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseDeviceTime } from "@hertzg/hikvision-api/config/time";
 *
 * const time = parseDeviceTime(
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

import { type RequestOptions, requestXml } from "../request.ts";
import { parseIsapi, present, requireText, text } from "../xml.ts";
import type { XmlElement } from "@std/xml";

/** The device time path. */
export const TIME_PATH = "/ISAPI/System/time";

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
 * import { parseTimeZoneOffset } from "@hertzg/hikvision-api/config/time";
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
 * Parses a `<Time>` document.
 *
 * @param xml The document text.
 * @returns The device time. `utcOffsetMinutes` is set when `timeZone`
 *   parses; `platformType` when the device sends it.
 * @throws {IsapiError} When the document is a failing `<ResponseStatus>`.
 * @throws {Error} When `timeMode`, `localTime` or `timeZone` is missing.
 *
 * @example A platform-synced NVR
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseDeviceTime } from "@hertzg/hikvision-api/config/time";
 *
 * const time = parseDeviceTime(
 *   "<Time><timeMode>platform</timeMode><platformType>EZVIZ</platformType>" +
 *     "<localTime>2026-10-22T11:33:52</localTime>" +
 *     "<timeZone>CST+3:00:00</timeZone></Time>",
 * );
 *
 * assertEquals(time.platformType, "EZVIZ");
 * assertEquals(time.utcOffsetMinutes, -180);
 * ```
 */
export function parseDeviceTime(xml: string): DeviceTime {
  return deviceTime(parseIsapi(xml));
}

/**
 * Reads the clock and time zone from a device.
 *
 * @param options Where the device is and how to log in.
 * @returns The device time.
 * @throws {HttpError} When the device answers with a status outside 2xx.
 * @throws {IsapiError} When the device answers a failing `<ResponseStatus>`.
 *
 * @example Read through a stubbed fetch
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { resolvesNext, spy } from "@std/testing/mock";
 * import { readDeviceTime } from "@hertzg/hikvision-api/config/time";
 *
 * const fetch = spy(resolvesNext([
 *   new Response(
 *     "<Time><timeMode>NTP</timeMode>" +
 *       "<localTime>2026-10-22T11:33:52+04:00</localTime>" +
 *       "<timeZone>CST-4:00:00</timeZone></Time>",
 *   ),
 * ]));
 *
 * const time = await readDeviceTime({
 *   baseUrl: "http://192.0.2.21",
 *   username: "admin",
 *   password: "hunter2",
 *   fetch,
 * });
 *
 * assertEquals(time.timeMode, "NTP");
 * assertEquals(fetch.calls[0].args[0], "http://192.0.2.21/ISAPI/System/time");
 * ```
 */
export async function readDeviceTime(
  options: RequestOptions,
): Promise<DeviceTime> {
  return deviceTime(await requestXml(options, TIME_PATH));
}

function deviceTime(root: XmlElement): DeviceTime {
  const timeZone = requireText(root, "timeZone");
  return {
    timeMode: requireText(root, "timeMode"),
    localTime: requireText(root, "localTime"),
    timeZone,
    ...present({
      utcOffsetMinutes: parseTimeZoneOffset(timeZone),
      platformType: text(root, "platformType"),
    }),
  };
}
