/**
 * `<accessInfo>`: a user name and access key the Video Doorbell PoE sends in
 * one branch of its cmd 1 (`LOGIN`) reply. The RLC-823A never sends it.
 *
 * Firmware: the doorbell's cmd 1 handler in `netserver` builds the element
 * itself, after base64-encoding both values, and writes both fields always.
 * There is no parser: the device never reads this element.
 *
 * @example Read the doorbell's login reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { accessInfo } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<accessInfo version="1.1"><userName>YWRtaW4=</userName>' +
 *     "<accesskey>c2VjcmV0</accesskey></accessInfo>",
 * ).root;
 *
 * assertEquals(accessInfo.decode(root).userName, "YWRtaW4=");
 * ```
 *
 * @module
 */

import { text, type XmlParam, xmlParam } from "../xml.ts";

/** The credentials in `<accessInfo>`. */
export type AccessInfo = {
  /** The user name, base64-encoded. */
  userName: string;
  /** The access key, base64-encoded. */
  accesskey: string;
};

/**
 * Codec for `<accessInfo>`.
 *
 * @example Build an `<accessInfo>` element
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { accessInfo } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = accessInfo.encode({ userName: "dXNlcg==", accesskey: "a2V5" });
 *
 * assertStringIncludes(xml, "<accesskey>a2V5</accesskey>");
 * ```
 */
export const accessInfo: XmlParam<"accessInfo", AccessInfo> = xmlParam(
  "accessInfo",
  {
    userName: text(),
    accesskey: text(),
  },
);
