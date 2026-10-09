/**
 * `<PushClientState>`: which channels a push client listens to. Read with
 * cmd 526 (`GET_CLIENT_STATE`) on the Video Doorbell PoE.
 *
 * Firmware: `net_param_push_client_state_x2s` reads `clientID` and
 * `channelIdList` when present, keeping at most 64 channels.
 * `net_param_push_client_state_s2x` writes both always.
 *
 * @example Read a cmd 526 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { pushClientState } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<PushClientState version="1.1"><clientID>client-7f3a</clientID>' +
 *     "<channelIdList><channelId>0</channelId></channelIdList></PushClientState>",
 * ).root;
 *
 * assertEquals(pushClientState.decode(root).channelIdList, ["0"]);
 * ```
 *
 * @module
 */

import { list, optional, text, type XmlParam, xmlParam } from "../xml.ts";

/** The push client state in `<PushClientState>`. */
export type PushClientState = {
  /** The client id from cmd 522, read up to 128 bytes. */
  clientID?: string;
  /**
   * Channels the client listens to, each as `<channelId>` text up to
   * 32 bytes. The parser keeps the first 64.
   */
  channelIdList?: string[];
};

/**
 * Codec for `<PushClientState>`.
 *
 * @example Build a cmd 526 request for one client
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { pushClientState } from "@hertzg/reolink-api/protocol/params";
 *
 * assertEquals(
 *   pushClientState.encode({ clientID: "client-7f3a" }),
 *   '<PushClientState version="1.1"><clientID>client-7f3a</clientID></PushClientState>',
 * );
 * ```
 */
export const pushClientState: XmlParam<"PushClientState", PushClientState> =
  xmlParam("PushClientState", {
    clientID: optional(text()),
    channelIdList: optional(list("channelId", text())),
  });
