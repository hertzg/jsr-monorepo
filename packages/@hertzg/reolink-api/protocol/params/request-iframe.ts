/**
 * `<RequestIframe>`: asks the encoder for a key frame on one stream. Sent
 * with cmd 189.
 *
 * Firmware: `net_iframe_req_x2s` reads each field when present and skips
 * the rest; it rejects a negative `channelId` and treats an unknown
 * `streamType` as `mainStream`. No serializer exists, so the camera never
 * writes this element.
 *
 * @example Build a cmd 189 request
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { requestIframe } from "@hertzg/reolink-api/protocol/params";
 *
 * assertEquals(
 *   requestIframe.encode({ channelId: 0, streamType: "subStream" }),
 *   '<RequestIframe version="1.1"><channelId>0</channelId>' +
 *     "<streamType>subStream</streamType></RequestIframe>",
 * );
 * ```
 *
 * @module
 */

import { int, oneOf, optional, type XmlParam, xmlParam } from "../xml.ts";

/** The key frame request in `<RequestIframe>`. */
export type RequestIframe = {
  /** Zero-based channel. */
  channelId?: number;
  /** The stream that should emit the key frame. */
  streamType?: "mainStream" | "subStream" | "mobileStream" | "externStream";
};

/**
 * Codec for `<RequestIframe>`.
 *
 * @example Read a `<RequestIframe>` element
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { requestIframe } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<RequestIframe version="1.1"><streamType>mainStream</streamType></RequestIframe>',
 * ).root;
 *
 * assertEquals(requestIframe.decode(root), { streamType: "mainStream" });
 * ```
 */
export const requestIframe: XmlParam<"RequestIframe", RequestIframe> = xmlParam(
  "RequestIframe",
  {
    channelId: optional(int()),
    streamType: optional(
      oneOf("mainStream", "subStream", "mobileStream", "externStream"),
    ),
  },
);
