/**
 * One alert from the event stream.
 *
 * Every part of `/ISAPI/Event/notification/alertStream` is an
 * `<EventNotificationAlert>`. An NVR writes the IP camera's number in
 * `<dynChannelID>` and its own channels (and the heartbeat) in `<channelID>`;
 * a camera writes `<channelID>1</channelID>` and adds `<channelName>`:
 *
 * ```xml
 * <EventNotificationAlert version="1.0" xmlns="http://www.hikvision.com/ver20/XMLSchema">
 * <ipAddress>192.0.2.10</ipAddress>
 * <portNo>80</portNo>
 * <protocol>HTTP</protocol>
 * <macAddress>02:00:00:00:00:01</macAddress>
 * <dynChannelID>7</dynChannelID>
 * <dateTime>2026-10-21T20:44:39</dateTime>
 * <activePostCount>1</activePostCount>
 * <eventType>VMD</eventType>
 * <eventState>active</eventState>
 * <eventDescription>Motion alarm</eventDescription>
 * </EventNotificationAlert>
 * ```
 *
 * What the stream means, as seen on real devices:
 *
 * - Motion is `eventType VMD`, `eventState active`, posted about once a
 *   second for as long as it lasts. Devices do not post `inactive` for VMD:
 *   motion ends when the posts stop. How long to wait is the consumer's
 *   call; {@link Alert.at} is the arrival time to measure it from.
 * - The heartbeat is `eventType videoloss`, `eventState inactive`, every
 *   10 seconds while nothing else is posted, and silent while alerts flow.
 *   So a liveness check counts every alert, not only heartbeats.
 * - `<dateTime>` is the device's clock. An NVR writes it without a zone, a
 *   camera with one. It is kept as text; `at` is the clock to trust.
 *
 * @example Parse a motion alert from an NVR
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseAlert } from "@hertzg/hikvision-api/events/alert";
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
 * @module
 */

import { element, elements, type Point, points, text, tokens } from "../xml.ts";
import { parse } from "@std/xml";

/**
 * A region reported with a smart event, from `<DetectionRegionList>`.
 *
 * The shape follows the ISAPI specification; no device in the test fleet
 * had a smart rule enabled, so it has not been checked against a live
 * stream.
 */
export type AlertRegion = {
  /** `<regionID>`, when present. */
  id?: number;
  /** `<sensitivityLevel>`, when present. */
  sensitivityLevel?: number;
  /** The region's corners, from `<RegionCoordinatesList>`. */
  coordinates: Point[];
  /** `<detectionTarget>` split on commas, such as `["human"]`. */
  detectionTarget: string[];
};

/** One `<EventNotificationAlert>`, with the time it arrived. */
export type Alert = {
  /**
   * The channel the alert is about: `<dynChannelID>` when present, else
   * `<channelID>`, else `0`. On an NVR, IP cameras are 1..n; `0` is the NVR
   * itself. A camera reports `1`.
   */
  channel: number;
  /** `<eventType>`, such as `VMD`, `videoloss`, `fielddetection` or `linedetection`. */
  eventType: string;
  /** `<eventState>`: `active` or `inactive`. */
  eventState: string;
  /** `<eventDescription>`, such as `Motion alarm`. */
  eventDescription?: string;
  /** `<dateTime>` as the device wrote it, zone or not. `""` when missing. */
  dateTime: string;
  /** When the alert arrived, as an ISO 8601 string. */
  at: string;
  /** `<activePostCount>`: how many posts this event has produced so far. */
  activePostCount?: number;
  /** `<channelName>`, which cameras send and NVRs do not. */
  channelName?: string;
  /** `<ipAddress>` of the device that posted. */
  ipAddress?: string;
  /** `<macAddress>` of the device that posted. */
  macAddress?: string;
  /** The regions of a smart event, when the alert carries a `<DetectionRegionList>`. */
  regions?: AlertRegion[];
};

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
 * @example A camera's heartbeat carries the channel name and a zone
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseAlert } from "@hertzg/hikvision-api/events/alert";
 *
 * const alert = parseAlert(
 *   '<EventNotificationAlert version="2.0" xmlns="http://www.hikvision.com/ver20/XMLSchema">' +
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
 */
export function parseAlert(xml: string, at: string): Alert {
  const root = parse(xml).root;
  const eventType = text(root, "eventType");
  if (eventType === undefined) {
    throw new Error(`ISAPI <${root.name.local}> has no <eventType>`);
  }
  const alert: Alert = {
    channel: Number(
      text(root, "dynChannelID") ?? text(root, "channelID") ?? "0",
    ),
    eventType,
    eventState: text(root, "eventState") ?? "active",
    dateTime: text(root, "dateTime") ?? "",
    at,
  };
  const optional = {
    eventDescription: text(root, "eventDescription"),
    activePostCount: number(text(root, "activePostCount")),
    channelName: text(root, "channelName"),
    ipAddress: text(root, "ipAddress"),
    macAddress: text(root, "macAddress"),
  };
  for (const [key, value] of Object.entries(optional)) {
    if (value !== undefined) {
      Object.assign(alert, { [key]: value });
    }
  }
  const regionList = element(root, "DetectionRegionList");
  if (regionList !== undefined) {
    alert.regions = elements(regionList, "DetectionRegionEntry").map(
      (entry) => {
        const list = element(entry, "RegionCoordinatesList");
        const region: AlertRegion = {
          coordinates: list === undefined ? [] : points(list),
          detectionTarget: tokens(text(entry, "detectionTarget")),
        };
        const id = number(text(entry, "regionID"));
        if (id !== undefined) {
          region.id = id;
        }
        const sensitivityLevel = number(text(entry, "sensitivityLevel"));
        if (sensitivityLevel !== undefined) {
          region.sensitivityLevel = sensitivityLevel;
        }
        return region;
      },
    );
  }
  return alert;
}

function number(value: string | undefined): number | undefined {
  return value === undefined ? undefined : Number(value);
}
