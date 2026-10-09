/**
 * `<Ptz3DLocation>`: a rectangle on the picture to centre and zoom the PTZ
 * camera onto (cmd 445). Request only: no firmware code writes it.
 *
 * Firmware: `net_ptz_3Dlocation_x2s` reads every field when present and
 * skips the rest, so each one may be missing. It rejects a `streamType`
 * outside the four names it maps.
 *
 * @example Zoom onto the top left quarter of the main stream
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { ptz3DLocation } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = ptz3DLocation.encode({
 *   channelId: 0,
 *   topLeftX: 0,
 *   topLeftY: 0,
 *   width: 1280,
 *   height: 720,
 *   speed: 32,
 *   streamType: "mainStream",
 * });
 *
 * assertStringIncludes(xml, "<streamType>mainStream</streamType>");
 * ```
 *
 * @module
 */

import {
  float,
  int,
  oneOf,
  optional,
  type XmlParam,
  xmlParam,
} from "../xml.ts";

/** The rectangle to move onto, in `<Ptz3DLocation>`. */
export type Ptz3DLocation = {
  /** Zero-based channel. */
  channelId?: number;
  /** Left edge of the rectangle; units are not established. */
  topLeftX?: number;
  /** Top edge of the rectangle; units are not established. */
  topLeftY?: number;
  /** Rectangle width; units are not established. */
  width?: number;
  /** Rectangle height; units are not established. */
  height?: number;
  /** Movement speed. */
  speed?: number;
  /** The stream whose picture the rectangle refers to. */
  streamType?: "mainStream" | "subStream" | "mobileStream" | "externStream";
};

/**
 * Codec for `<Ptz3DLocation>`.
 *
 * @example Read back a request
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { ptz3DLocation } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<Ptz3DLocation version="1.1"><topLeftX>10.5</topLeftX>' +
 *     "<streamType>subStream</streamType></Ptz3DLocation>",
 * ).root;
 *
 * assertEquals(ptz3DLocation.decode(root), {
 *   topLeftX: 10.5,
 *   streamType: "subStream",
 * });
 * ```
 */
export const ptz3DLocation: XmlParam<"Ptz3DLocation", Ptz3DLocation> = xmlParam(
  "Ptz3DLocation",
  {
    channelId: optional(int()),
    topLeftX: optional(float()),
    topLeftY: optional(float()),
    width: optional(float()),
    height: optional(float()),
    speed: optional(int()),
    streamType: optional(
      oneOf("mainStream", "subStream", "mobileStream", "externStream"),
    ),
  },
);
