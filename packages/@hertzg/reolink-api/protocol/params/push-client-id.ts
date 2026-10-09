/**
 * `<PushClientID>`: registers a phone for push notifications and returns
 * the client id the Video Doorbell PoE assigns it. Carried by cmd 522
 * (`GET_CLIENT_ID`).
 *
 * Firmware: `net_param_push_client_id_x2s` reads `clientType` and
 * `pushToken` when present. `net_param_push_client_id_s2x` writes only
 * `clientID`, always. The request and reply share the element but no field.
 *
 * @example Read a cmd 522 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { pushClientId } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<PushClientID version="1.1"><clientID>client-7f3a</clientID></PushClientID>',
 * ).root;
 *
 * assertEquals(pushClientId.decode(root).clientID, "client-7f3a");
 * ```
 *
 * @module
 */

import { optional, text, type XmlParam, xmlParam } from "../xml.ts";

/** The push registration in `<PushClientID>`. */
export type PushClientId = {
  /** Request only: the phone platform as text, read up to 128 bytes. */
  clientType?: string;
  /** Request only: the platform push token, read up to 256 bytes. */
  pushToken?: string;
  /** Reply only: the client id the device assigned. */
  clientID?: string;
};

/**
 * Codec for `<PushClientID>`.
 *
 * @example Build a cmd 522 request
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { pushClientId } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = pushClientId.encode({
 *   clientType: "android",
 *   pushToken: "token-abc123",
 * });
 *
 * assertStringIncludes(xml, "<pushToken>token-abc123</pushToken>");
 * ```
 */
export const pushClientId: XmlParam<"PushClientID", PushClientId> = xmlParam(
  "PushClientID",
  {
    clientType: optional(text()),
    pushToken: optional(text()),
    clientID: optional(text()),
  },
);
