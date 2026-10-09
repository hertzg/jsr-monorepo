/**
 * `<cropSnap>`: the cmd 230 reply describing the snapshot of the cropped
 * region. The request is `<CropSnap>`; the reply element is spelled with a
 * lower-case `c` and has different fields.
 *
 * Firmware: the cmd 230 handler writes `channelId` and `pictureSize`,
 * always, from the snap module's reply.
 *
 * @example Read the cmd 230 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { cropSnapReply } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<cropSnap version="1.1"><channelId>0</channelId>' +
 *     "<pictureSize>48213</pictureSize></cropSnap>",
 * ).root;
 *
 * assertEquals(cropSnapReply.decode(root), {
 *   channelId: 0,
 *   pictureSize: 48213,
 * });
 * ```
 *
 * @module
 */

import { int, type XmlParam, xmlParam } from "../xml.ts";

/** The snapshot description in `<cropSnap>`. */
export type CropSnapReply = {
  /** Zero-based channel. */
  channelId: number;
  /** Size of the picture the snap module produced; the unit is not established. */
  pictureSize: number;
};

/**
 * Codec for `<cropSnap>`.
 *
 * @example Build a `<cropSnap>` element
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { cropSnapReply } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = cropSnapReply.encode({ channelId: 0, pictureSize: 51200 });
 *
 * assertStringIncludes(xml, "<pictureSize>51200</pictureSize>");
 * ```
 */
export const cropSnapReply: XmlParam<"cropSnap", CropSnapReply> = xmlParam(
  "cropSnap",
  {
    channelId: int(),
    pictureSize: int(),
  },
);
