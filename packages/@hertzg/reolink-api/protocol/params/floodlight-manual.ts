/**
 * `<FloodlightManual>`: turns the floodlight on or off by hand. Written
 * with cmd 288.
 *
 * Firmware: `nets_param_floodlight_status_x2s` reads `channel` and
 * `status`, skipping either when missing, and rejects a negative
 * `channel`. No serializer exists, so the field order follows the
 * firmware's struct layout. Every field is optional.
 *
 * @example Read a `<FloodlightManual>` element
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { floodlightManual } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<FloodlightManual version="1.1"><channel>0</channel><status>1</status>' +
 *     "</FloodlightManual>",
 * ).root;
 *
 * assertEquals(floodlightManual.decode(root).status, 1);
 * ```
 *
 * @module
 */

import { int, optional, type XmlParam, xmlParam } from "../xml.ts";

/** The manual floodlight switch in `<FloodlightManual>`. */
export type FloodlightManual = {
  /** Zero-based channel; the firmware rejects a negative value. */
  channel?: number;
  /** Floodlight state as a number. */
  status?: number;
};

/**
 * Codec for `<FloodlightManual>`.
 *
 * @example Switch the floodlight
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { floodlightManual } from "@hertzg/reolink-api/protocol/params";
 *
 * assertEquals(
 *   floodlightManual.encode({ channel: 0, status: 1 }),
 *   '<FloodlightManual version="1.1"><channel>0</channel><status>1</status>' +
 *     "</FloodlightManual>",
 * );
 * ```
 */
export const floodlightManual: XmlParam<"FloodlightManual", FloodlightManual> =
  xmlParam("FloodlightManual", {
    channel: optional(int()),
    status: optional(int()),
  });
