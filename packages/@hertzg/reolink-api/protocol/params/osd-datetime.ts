/**
 * `<OsdDatetime>`: the date and time drawn over the video. The camera
 * replies with it to cmd 44 (`GET_OSD_CFG_V20`) and reads it from cmd 45
 * (`SET_OSD_CFG_V20`).
 *
 * Firmware: the cmd 44 handler writes every field, always, and writes
 * `language` as `Chinese` or `English`. The parser `nets_osd_date_x2s`
 * reads whichever fields are present, so none is required; it reads any
 * `language` other than `Chinese` as `English`.
 *
 * @example Read a cmd 44 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { osdDatetime } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<OsdDatetime version="1.1"><channelId>0</channelId><enable>1</enable>' +
 *     "<topLeftX>0</topLeftX><topLeftY>0</topLeftY><width>0</width>" +
 *     "<height>0</height><language>English</language></OsdDatetime>",
 * ).root;
 *
 * assertEquals(osdDatetime.decode(root).language, "English");
 * ```
 *
 * @module
 */

import { int, oneOf, optional, type XmlParam, xmlParam } from "../xml.ts";

/** The date and time overlay in `<OsdDatetime>`. */
export type OsdDatetime = {
  /** Zero-based channel. */
  channelId?: number;
  /** 1 to draw the date and time, 0 to hide it. */
  enable?: number;
  /** Left edge of the overlay. */
  topLeftX?: number;
  /** Top edge of the overlay. */
  topLeftY?: number;
  /** Width of the overlay, 0 or more. */
  width?: number;
  /** Height of the overlay, 0 or more. */
  height?: number;
  /** Overlay language. */
  language?: "Chinese" | "English";
};

/**
 * Codec for `<OsdDatetime>`.
 *
 * @example Build an `<OsdDatetime>` element for cmd 45
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { osdDatetime } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = osdDatetime.encode({ channelId: 0, enable: 0 });
 *
 * assertStringIncludes(xml, "<enable>0</enable>");
 * ```
 */
export const osdDatetime: XmlParam<"OsdDatetime", OsdDatetime> = xmlParam(
  "OsdDatetime",
  {
    channelId: optional(int()),
    enable: optional(int()),
    topLeftX: optional(int()),
    topLeftY: optional(int()),
    width: optional(int()),
    height: optional(int()),
    language: optional(oneOf("Chinese", "English")),
  },
);
