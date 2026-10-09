/**
 * `<PushInfo>`: registers or removes a phone for push notifications. Sent
 * with cmd 124 (add) and cmd 125 (delete).
 *
 * Firmware: `nets_push_info_x2s` reads each field when present and skips
 * the rest. No serializer exists, so the camera never writes this element.
 *
 * @example Build a cmd 124 request
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { pushInfo } from "@hertzg/reolink-api/protocol/params";
 *
 * assertEquals(
 *   pushInfo.encode({ token: "fcm-token-123", phoneType: "android", clientID: "phone-1" }),
 *   '<PushInfo version="1.1"><token>fcm-token-123</token>' +
 *     "<phoneType>android</phoneType><clientID>phone-1</clientID></PushInfo>",
 * );
 * ```
 *
 * @module
 */

import { optional, text, type XmlParam, xmlParam } from "../xml.ts";

/** The push registration in `<PushInfo>`. */
export type PushInfo = {
  /** The phone's push token. */
  token?: string;
  /** The phone platform; free text to the firmware. */
  phoneType?: string;
  /** An identifier for the client app instance. */
  clientID?: string;
};

/**
 * Codec for `<PushInfo>`.
 *
 * @example Read a `<PushInfo>` element
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { pushInfo } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<PushInfo version="1.1"><token>apns-token-456</token></PushInfo>',
 * ).root;
 *
 * assertEquals(pushInfo.decode(root), { token: "apns-token-456" });
 * ```
 */
export const pushInfo: XmlParam<"PushInfo", PushInfo> = xmlParam("PushInfo", {
  token: optional(text()),
  phoneType: optional(text()),
  clientID: optional(text()),
});
