/**
 * `<PushCreateListener>`: subscribes a push client to a channel's events.
 * Carried by cmd 524 (`CREATE_PUSH_LISTENER`) on the Video Doorbell PoE.
 *
 * Firmware: `net_param_create_push_listener_x2s` reads `clientID` and
 * `channelId` when present. There is no serializer: the element only
 * appears in requests.
 *
 * @example Read a cmd 524 request
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { pushCreateListener } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   "<PushCreateListener><clientID>client-7f3a</clientID>" +
 *     "<channelId>0</channelId></PushCreateListener>",
 * ).root;
 *
 * assertEquals(pushCreateListener.decode(root).channelId, "0");
 * ```
 *
 * @module
 */

import { optional, text, type XmlParam, xmlParam } from "../xml.ts";

/** The listener request in `<PushCreateListener>`. */
export type PushCreateListener = {
  /** The client id from cmd 522, read up to 128 bytes. */
  clientID?: string;
  /** The channel, read as text up to 32 bytes rather than as a number. */
  channelId?: string;
};

/**
 * Codec for `<PushCreateListener>`.
 *
 * @example Build a cmd 524 request
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { pushCreateListener } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = pushCreateListener.encode({
 *   clientID: "client-7f3a",
 *   channelId: "0",
 * });
 *
 * assertStringIncludes(xml, "<clientID>client-7f3a</clientID>");
 * ```
 */
export const pushCreateListener: XmlParam<
  "PushCreateListener",
  PushCreateListener
> = xmlParam("PushCreateListener", {
  clientID: optional(text()),
  channelId: optional(text()),
});
