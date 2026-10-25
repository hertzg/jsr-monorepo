/**
 * Parses one `<EventNotificationAlert>` document from its text.
 *
 * @module
 */

import { parseIsapi } from "../status/parse-isapi.ts";
import { type Alert, decodeAlert } from "./decode-alert.ts";

/**
 * Parses one `<EventNotificationAlert>` document.
 *
 * Reads leniently: only `<eventType>` is required, every other field is
 * optional, and elements it does not know are ignored.
 *
 * @param xml The part's body as text.
 * @param at When the part arrived, as an ISO 8601 string.
 * @returns The alert.
 * @throws {Error} When the document has no `<eventType>`.
 *
 * @example Parse a motion alert from an NVR
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseAlert } from "./parse-alert.ts";
 *
 * const alert = parseAlert(
 *   "<EventNotificationAlert><ipAddress>192.0.2.10</ipAddress>" +
 *     "<dynChannelID>7</dynChannelID><dateTime>2026-10-21T20:44:39</dateTime>" +
 *     "<activePostCount>1</activePostCount><eventType>VMD</eventType>" +
 *     "<eventState>active</eventState><eventDescription>Motion alarm</eventDescription>" +
 *     "</EventNotificationAlert>",
 *   "2026-10-21T16:44:39.512Z",
 * );
 *
 * assertEquals(alert, {
 *   channel: 7,
 *   eventType: "VMD",
 *   eventState: "active",
 *   eventDescription: "Motion alarm",
 *   dateTime: "2026-10-21T20:44:39",
 *   at: "2026-10-21T16:44:39.512Z",
 *   activePostCount: 1,
 *   ipAddress: "192.0.2.10",
 * });
 * ```
 *
 * @example A camera's heartbeat carries the channel name and a zone
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseAlert } from "./parse-alert.ts";
 *
 * const alert = parseAlert(
 *   '<?xml version="1.0" encoding="UTF-8"?>' +
 *     '<EventNotificationAlert version="2.0" xmlns="http://www.hikvision.com/ver20/XMLSchema">' +
 *     "<ipAddress>192.0.2.21</ipAddress><ipv6Address>::</ipv6Address>" +
 *     "<channelID>1</channelID><dateTime>2026-10-21T20:44:20+04:00</dateTime>" +
 *     "<eventType>videoloss</eventType><eventState>inactive</eventState>" +
 *     "<channelName>Camera 01</channelName></EventNotificationAlert>",
 *   "2026-10-21T16:44:20.004Z",
 * );
 *
 * assertEquals(alert.channel, 1);
 * assertEquals(alert.channelName, "Camera 01");
 * assertEquals(alert.dateTime, "2026-10-21T20:44:20+04:00");
 * ```
 *
 * @example An NVR's smart alert carries the box around the target
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseAlert } from "./parse-alert.ts";
 *
 * const alert = parseAlert(
 *   "<EventNotificationAlert><dynChannelID>3</dynChannelID>" +
 *     "<eventType>fielddetection</eventType><eventState>active</eventState>" +
 *     "<DetectionRegionList><DetectionRegionEntry><regionID>0</regionID>" +
 *     "<RegionCoordinatesList></RegionCoordinatesList>" +
 *     "<TargetRect><X>412</X><Y>268</Y><width>95</width><height>230</height></TargetRect>" +
 *     "<detectionTarget>human</detectionTarget>" +
 *     "</DetectionRegionEntry></DetectionRegionList></EventNotificationAlert>",
 *   "2026-10-21T16:44:20.004Z",
 * );
 *
 * assertEquals(alert.regions, [{
 *   id: 0,
 *   coordinates: [],
 *   detectionTarget: ["human"],
 *   targetRect: { x: 412, y: 268, width: 95, height: 230 },
 * }]);
 * ```
 */
export function parseAlert(xml: string, at: string): Alert {
  return decodeAlert(parseIsapi(xml), at);
}
