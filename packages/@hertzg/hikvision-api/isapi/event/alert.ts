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
 * - Smart events (`fielddetection`, `linedetection` and the other rules in
 *   `smart/rules.ts`) do post `eventState inactive` on some firmware, and
 *   carry the regions that fired in a `<DetectionRegionList>`.
 * - The heartbeat is `eventType videoloss`, `eventState inactive`, every
 *   10 seconds. An NVR goes quiet on heartbeats while alerts flow, so a
 *   liveness check counts every alert, not only heartbeats. A camera keeps
 *   its heartbeat up through a motion burst.
 * - `<activePostCount>` on an NVR is how many channels have an active event
 *   right now (`0` on the heartbeat), not a count of posts.
 * - `<dateTime>` is the device's clock. An NVR writes it without a zone, a
 *   camera with one. It is kept as text; `at` is the clock to trust.
 * - A camera starts each part with an `<?xml …?>` declaration; an NVR does
 *   not. Both parse the same.
 *
 * @example Parse a motion alert from an NVR
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseAlert } from "./alert.ts";
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

import {
  document,
  int,
  list,
  obj,
  optional,
  type Point,
  points,
  text,
  tokens,
} from "../document.ts";

/**
 * Where a smart event saw its target, from `<TargetRect>`.
 *
 * AcuSense and DeepinView cameras send it with every smart alert, in the
 * normalized 1000 x 1000 screen space. The rule's own polygon may be left
 * out at the same time, leaving {@link AlertRegion.coordinates} empty.
 */
export type TargetRect = {
  /** `<X>` of the top-left corner. */
  x: number;
  /** `<Y>` of the top-left corner. */
  y: number;
  /** `<width>`. */
  width: number;
  /** `<height>`. */
  height: number;
};

/**
 * A region reported with a smart event, from `<DetectionRegionList>`.
 *
 * An NVR relaying an AcuSense camera posts one `<DetectionRegionEntry>` per
 * region that fired, with `<regionID>`, a `<RegionCoordinatesList>` that may
 * be empty, the `<TargetRect>` of what was seen and the `<detectionTarget>`.
 */
export type AlertRegion = {
  /** `<regionID>`, when present. Rules count from 0 here, from 1 in `smart/rules.ts`. */
  id?: number;
  /** `<sensitivityLevel>`, when present. */
  sensitivityLevel?: number;
  /** The region's corners, from `<RegionCoordinatesList>`; `[]` when the list is empty. */
  coordinates: Point[];
  /** `<detectionTarget>` split on commas, such as `["human"]`. */
  detectionTarget: string[];
  /** The box around what was detected, from `<TargetRect>`, when present. */
  targetRect?: TargetRect;
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
  /**
   * `<eventState>`: `active` or `inactive`. VMD only ever posts `active`;
   * smart events post `inactive` on some firmware when the rule clears.
   */
  eventState: string;
  /** `<eventDescription>`, such as `Motion alarm`. */
  eventDescription?: string;
  /** `<dateTime>` as the device wrote it, zone or not. `""` when missing. */
  dateTime: string;
  /** When the alert arrived, as an ISO 8601 string. */
  at: string;
  /**
   * `<activePostCount>`: on an NVR, how many channels have an active event
   * right now; `0` on the heartbeat. Not a count of posts.
   */
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

const alert = document({
  eventType: text(),
  eventState: optional(text()),
  eventDescription: optional(text()),
  dateTime: optional(text()),
  dynChannelID: optional(int()),
  channelID: optional(int()),
  activePostCount: optional(int()),
  channelName: optional(text()),
  ipAddress: optional(text()),
  macAddress: optional(text()),
  DetectionRegionList: optional(list(
    "DetectionRegionEntry",
    obj({
      regionID: optional(int()),
      sensitivityLevel: optional(int()),
      RegionCoordinatesList: optional(points()),
      TargetRect: optional(obj({
        X: int(),
        Y: int(),
        width: int(),
        height: int(),
      })),
      detectionTarget: optional(tokens()),
    }),
  )),
});

type WireAlert = ReturnType<typeof alert.parse>;
type WireRegion = NonNullable<WireAlert["DetectionRegionList"]>[number];

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
 * import { parseAlert } from "./alert.ts";
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
 * import { parseAlert } from "./alert.ts";
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
  const { dynChannelID, channelID, DetectionRegionList, ...fields } = alert
    .parse(xml);
  return {
    ...fields,
    channel: dynChannelID ?? channelID ?? 0,
    eventState: fields.eventState ?? "active",
    dateTime: fields.dateTime ?? "",
    at,
    ...(DetectionRegionList && { regions: DetectionRegionList.map(toRegion) }),
  };
}

function toRegion(entry: WireRegion): AlertRegion {
  const {
    regionID,
    RegionCoordinatesList,
    TargetRect,
    detectionTarget,
    ...rest
  } = entry;
  return {
    ...rest,
    ...(regionID !== undefined && { id: regionID }),
    coordinates: RegionCoordinatesList ?? [],
    detectionTarget: detectionTarget ?? [],
    ...(TargetRect && {
      targetRect: {
        x: TargetRect.X,
        y: TargetRect.Y,
        width: TargetRect.width,
        height: TargetRect.height,
      },
    }),
  };
}
