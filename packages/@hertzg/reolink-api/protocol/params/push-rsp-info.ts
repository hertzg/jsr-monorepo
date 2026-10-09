/**
 * `<PushRspInfo>`: the push registration handle and the device's UID and UID
 * key, as cmd 124 (`PUSH_ADD_V20`) replies.
 *
 * Firmware: the cmd 124 handler in `netserver` builds the element itself and
 * writes every field, always. It writes `registerHandle` as -1 when the
 * registration produced no handle. There is no parser: the camera never
 * reads this element.
 *
 * @example Read the cmd 124 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { pushRspInfo } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<PushRspInfo version="1.1"><registerHandle>5</registerHandle>' +
 *     "<uid>95270000ABCDEFGH</uid><uidKey>key-0001</uidKey></PushRspInfo>",
 * ).root;
 *
 * assertEquals(pushRspInfo.decode(root).registerHandle, 5);
 * ```
 *
 * @module
 */

import { int, text, type XmlParam, xmlParam } from "../xml.ts";

/** The push registration result in `<PushRspInfo>`. */
export type PushRspInfo = {
  /** The registration handle; -1 when none was assigned. */
  registerHandle: number;
  /** The device UID. */
  uid: string;
  /** The device UID key. */
  uidKey: string;
};

/**
 * Codec for `<PushRspInfo>`.
 *
 * @example Build a `<PushRspInfo>` element
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { pushRspInfo } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = pushRspInfo.encode({
 *   registerHandle: -1,
 *   uid: "95270000ABCDEFGH",
 *   uidKey: "key-0001",
 * });
 *
 * assertStringIncludes(xml, "<registerHandle>-1</registerHandle>");
 * ```
 */
export const pushRspInfo: XmlParam<"PushRspInfo", PushRspInfo> = xmlParam(
  "PushRspInfo",
  {
    registerHandle: int(),
    uid: text(),
    uidKey: text(),
  },
);
