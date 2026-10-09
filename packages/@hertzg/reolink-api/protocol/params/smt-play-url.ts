/**
 * `<SmtPlayUrl>`: which channel and stream to get a play URL for (cmd 346).
 * Request only: no firmware code writes it.
 *
 * Firmware: `nets_smt_play_url_x2s` reads `channelId` (rejecting negative
 * values) and `stream_type` when present and skips the rest, so each field
 * may be missing.
 *
 * @example Ask for the play URL of channel 0
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { smtPlayUrl } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = smtPlayUrl.encode({ channelId: 0, stream_type: 1 });
 *
 * assertStringIncludes(xml, "<stream_type>1</stream_type>");
 * ```
 *
 * @module
 */

import { int, optional, type XmlParam, xmlParam } from "../xml.ts";

/** The play URL request in `<SmtPlayUrl>`. */
export type SmtPlayUrl = {
  /** Zero-based channel. */
  channelId?: number;
  /** Stream type as a number; the firmware does not name the values. */
  stream_type?: number;
};

/**
 * Codec for `<SmtPlayUrl>`.
 *
 * @example Read back a request
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { smtPlayUrl } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<SmtPlayUrl version="1.1"><channelId>0</channelId>' +
 *     "<stream_type>0</stream_type></SmtPlayUrl>",
 * ).root;
 *
 * assertEquals(smtPlayUrl.decode(root), { channelId: 0, stream_type: 0 });
 * ```
 */
export const smtPlayUrl: XmlParam<"SmtPlayUrl", SmtPlayUrl> = xmlParam(
  "SmtPlayUrl",
  {
    channelId: optional(int()),
    stream_type: optional(int()),
  },
);
