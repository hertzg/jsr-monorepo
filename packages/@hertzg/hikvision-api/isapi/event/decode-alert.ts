/**
 * Decodes one alert from the event stream.
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
 *   `smart/`) do post `eventState inactive` on some firmware, and carry the
 *   regions that fired in a `<DetectionRegionList>`. An AcuSense camera
 *   through an NVR posts entries with an empty `<regionID></regionID>` and
 *   an empty `<RegionCoordinatesList>`, plus a `<bkgUrl>` snapshot; those
 *   read as a region without `id`, with no coordinates, and `pictureUrl`.
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
 * @module
 */

import { isElement, type XmlElement } from "@std/xml";
import type { OneField } from "../document/decode-fields.ts";
import { document } from "../document/document.ts";
import { int } from "../document/int.ts";
import { list } from "../document/list.ts";
import { obj } from "../document/obj.ts";
import { optional } from "../document/optional.ts";
import type { Point } from "../document/points.ts";
import { scalar } from "../document/scalar.ts";
import { text } from "../document/text.ts";
import { tokens } from "../document/tokens.ts";

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
  /**
   * The box around what was detected, from `<TargetRect>`, when present
   * and whole: a `<TargetRect>` with an empty or unreadable number is no box.
   */
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
  /**
   * `<bkgUrl>`: where to fetch the snapshot the device took for a smart
   * event, with the same credentials (`<URLCertificationType>` says which
   * scheme, usually `digest`). Sent when `pictureTransport` is `url`.
   */
  pictureUrl?: string;
  /**
   * `<detectionPictureTransType>`: `url` when the snapshot is at
   * {@link Alert.pictureUrl}, `binary` when it follows as an image part of
   * the stream.
   */
  pictureTransport?: string;
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
  bkgUrl: optional(text()),
  detectionPictureTransType: optional(text()),
  DetectionRegionList: list(
    "DetectionRegionEntry",
    obj({
      regionID: optional(int()),
      sensitivityLevel: optional(int()),
      RegionCoordinatesList: optional(readablePoints()),
      TargetRect: optional(obj({
        X: optional(readableInt()),
        Y: optional(readableInt()),
        width: optional(readableInt()),
        height: optional(readableInt()),
      })),
      detectionTarget: optional(tokens()),
    }),
  ),
});

type WireAlert = ReturnType<typeof alert.parse>;
type WireRegion = WireAlert["DetectionRegionList"][number];

/**
 * Decodes one `<EventNotificationAlert>` root element.
 *
 * Reads leniently: only `<eventType>` is required, every other field is
 * optional, and elements it does not know are ignored.
 *
 * @param root The `<EventNotificationAlert>` element.
 * @param at When the part arrived, as an ISO 8601 string.
 * @returns The alert.
 * @throws {Error} When the document has no `<eventType>`.
 *
 * @example Decode a motion alert from an NVR
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseIsapi } from "../status/parse-isapi.ts";
 * import { decodeAlert } from "./decode-alert.ts";
 *
 * const alert = decodeAlert(
 *   parseIsapi(
 *     "<EventNotificationAlert><ipAddress>192.0.2.10</ipAddress>" +
 *       "<dynChannelID>7</dynChannelID><dateTime>2026-10-21T20:44:39</dateTime>" +
 *       "<activePostCount>1</activePostCount><eventType>VMD</eventType>" +
 *       "<eventState>active</eventState><eventDescription>Motion alarm</eventDescription>" +
 *       "</EventNotificationAlert>",
 *   ),
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
 */
export function decodeAlert(root: XmlElement, at: string): Alert {
  return toAlert(alert.decode(root), at);
}

function toAlert(wire: WireAlert, at: string): Alert {
  const {
    dynChannelID,
    channelID,
    DetectionRegionList,
    bkgUrl,
    detectionPictureTransType,
    ...fields
  } = wire;
  return {
    ...fields,
    channel: dynChannelID ?? channelID ?? 0,
    eventState: fields.eventState ?? "active",
    dateTime: fields.dateTime ?? "",
    at,
    ...(DetectionRegionList.length > 0 &&
      { regions: DetectionRegionList.map(toRegion) }),
    ...(bkgUrl !== undefined && { pictureUrl: bkgUrl }),
    ...(detectionPictureTransType !== undefined &&
      { pictureTransport: detectionPictureTransType }),
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
    ...(TargetRect && toTargetRect(TargetRect)),
  };
}

// A box is whole or absent: a camera that writes `<X></X>` reported no box.
function toTargetRect(
  { X: x, Y: y, width, height }: NonNullable<WireRegion["TargetRect"]>,
): { targetRect: TargetRect } | undefined {
  if (
    x === undefined || y === undefined || width === undefined ||
    height === undefined
  ) {
    return undefined;
  }
  return { targetRect: { x, y, width, height } };
}

// The alert stream must not end over one unreadable number, so alert
// numbers decode as `undefined` where `int()` would throw.
function readableInt(): OneField<number | undefined> {
  return scalar((value) => {
    const parsed = Number(value);
    return value.trim() === "" || Number.isNaN(parsed) ? undefined : parsed;
  });
}

// A pair with an unreadable coordinate is no point.
function readablePoints(): OneField<Point[]> {
  const pair = obj({
    positionX: optional(readableInt()),
    positionY: optional(readableInt()),
  });
  return {
    decode: (element) =>
      element.children.filter(isElement).flatMap((child) => {
        const { positionX: x, positionY: y } = pair.decode(child);
        return x === undefined || y === undefined ? [] : [{ x, y }];
      }),
  };
}
