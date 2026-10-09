/**
 * `<Shutter>`: the sensor shutter speed, as a fraction of a second. The
 * camera replies with it to cmd 158 (`CGI_GET_SHUTTER`).
 *
 * Firmware: `nets_shutter_s2x` writes only `shutterLevel`, mapped from a
 * closed list of speeds; an unknown speed index writes no element at all.
 * The table's parser for `<Shutter>` is the shared
 * `nets_isp_advance_common_x2s`, which reads `channelId` and skips
 * `shutterLevel`, so neither field is required.
 *
 * @example Read a cmd 158 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { shutter } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<Shutter version="1.1"><shutterLevel>1/60</shutterLevel></Shutter>',
 * ).root;
 *
 * assertEquals(shutter.decode(root).shutterLevel, "1/60");
 * ```
 *
 * @module
 */

import { int, oneOf, optional, type XmlParam, xmlParam } from "../xml.ts";

/** The shutter speed in `<Shutter>`. */
export type Shutter = {
  /** Zero-based channel; read by the parser, never written by the camera. */
  channelId?: number;
  /** Shutter speed as a fraction of a second; always written in replies. */
  shutterLevel?:
    | "1/3"
    | "1/4"
    | "1/5"
    | "1/6"
    | "1/8"
    | "1/12"
    | "1/15"
    | "1/25"
    | "1/30"
    | "1/50"
    | "1/60"
    | "1/100"
    | "1/120"
    | "1/250"
    | "1/500"
    | "1/1000"
    | "1/2000"
    | "1/4000"
    | "1/10000";
};

/**
 * Codec for `<Shutter>`.
 *
 * @example Build a `<Shutter>` element
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { shutter } from "@hertzg/reolink-api/protocol/params";
 *
 * assertEquals(
 *   shutter.encode({ shutterLevel: "1/250" }),
 *   '<Shutter version="1.1"><shutterLevel>1/250</shutterLevel></Shutter>',
 * );
 * ```
 */
export const shutter: XmlParam<"Shutter", Shutter> = xmlParam("Shutter", {
  channelId: optional(int()),
  shutterLevel: optional(
    oneOf(
      "1/3",
      "1/4",
      "1/5",
      "1/6",
      "1/8",
      "1/12",
      "1/15",
      "1/25",
      "1/30",
      "1/50",
      "1/60",
      "1/100",
      "1/120",
      "1/250",
      "1/500",
      "1/1000",
      "1/2000",
      "1/4000",
      "1/10000",
    ),
  ),
});
