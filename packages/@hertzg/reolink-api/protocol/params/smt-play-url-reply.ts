/**
 * `<SmtPlayURL>`: the play URL in the cmd 346 reply. The request is
 * `<SmtPlayUrl>`; the reply element ends in upper-case `URL` and carries
 * only the URL.
 *
 * Firmware: the cmd 346 handler writes `url`, always.
 *
 * @example Read the cmd 346 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { smtPlayUrlReply } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<SmtPlayURL version="1.1"><url>rtsp://192.168.1.10:554/h264Preview_01_main</url></SmtPlayURL>',
 * ).root;
 *
 * assertEquals(
 *   smtPlayUrlReply.decode(root).url,
 *   "rtsp://192.168.1.10:554/h264Preview_01_main",
 * );
 * ```
 *
 * @module
 */

import { text, type XmlParam, xmlParam } from "../xml.ts";

/** The play URL in `<SmtPlayURL>`. */
export type SmtPlayUrlReply = {
  /** The play URL. */
  url: string;
};

/**
 * Codec for `<SmtPlayURL>`.
 *
 * @example Build a `<SmtPlayURL>` element
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { smtPlayUrlReply } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = smtPlayUrlReply.encode({ url: "rtsp://10.0.0.5/sub" });
 *
 * assertStringIncludes(xml, "<url>rtsp://10.0.0.5/sub</url>");
 * ```
 */
export const smtPlayUrlReply: XmlParam<"SmtPlayURL", SmtPlayUrlReply> =
  xmlParam("SmtPlayURL", { url: text() });
