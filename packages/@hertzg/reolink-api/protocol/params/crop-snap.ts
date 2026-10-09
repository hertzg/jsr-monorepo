/**
 * `<CropSnap>`: a request for a snapshot of the cropped region, sent with
 * cmd 230.
 *
 * Firmware: `nets_param_crop_snap_x2s` reads whichever fields are present,
 * so every field is optional. It rejects a negative `channelId` and a
 * width or height above 65535. No firmware code writes this element.
 *
 * The height element is spelled `<heigth>`. The firmware matches that
 * spelling only, so `<height>` is ignored.
 *
 * @example Build a cmd 230 request
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cropSnap } from "@hertzg/reolink-api/protocol/params";
 *
 * assertEquals(
 *   cropSnap.encode({ channelId: 0, width: 1280, heigth: 720 }),
 *   '<CropSnap version="1.1"><channelId>0</channelId><width>1280</width>' +
 *     "<heigth>720</heigth></CropSnap>",
 * );
 * ```
 *
 * @module
 */

import { int, optional, type XmlParam, xmlParam } from "../xml.ts";

/** The snapshot size in `<CropSnap>`. */
export type CropSnap = {
  /** Zero-based channel. */
  channelId?: number;
  /** Snapshot width, 0 to 65535. */
  width?: number;
  /** Snapshot height, 0 to 65535; the firmware's spelling. */
  heigth?: number;
};

/**
 * Codec for `<CropSnap>`.
 *
 * @example Read a `<CropSnap>` element
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { cropSnap } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<CropSnap version="1.1"><channelId>0</channelId><width>640</width>' +
 *     "<heigth>360</heigth></CropSnap>",
 * ).root;
 *
 * assertEquals(cropSnap.decode(root).heigth, 360);
 * ```
 */
export const cropSnap: XmlParam<"CropSnap", CropSnap> = xmlParam("CropSnap", {
  channelId: optional(int()),
  width: optional(int()),
  heigth: optional(int()),
});
