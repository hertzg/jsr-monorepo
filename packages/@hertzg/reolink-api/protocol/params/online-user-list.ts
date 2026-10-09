/**
 * `<OnlineUserList>`: the sessions logged in to the camera. Read with
 * cmd 120; cmd 121 sends it back to act on the listed sessions.
 *
 * Firmware: netserver builds the cmd 120 reply itself and writes every
 * `<OnlineUser>` field, always, with `macAddress` empty and `isOnline` 1.
 * `nets_param_user_online_x2s` reads up to 20 `<OnlineUser>` children and
 * aborts on any other child; each must carry `sessionId`, and the other
 * fields are read when present. It also reads `password`, which the reply
 * never carries. For cmd 121, netserver acts on every user whose
 * `enableOutoffLine` is 1.
 *
 * @example Read the cmd 120 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { onlineUserList } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<OnlineUserList version="1.1"><OnlineUser><userId>0</userId>' +
 *     "<sessionId>17</sessionId><userName>admin</userName>" +
 *     "<userLevel>1</userLevel><ipAddress>192.168.1.20</ipAddress>" +
 *     "<macAddress></macAddress><enableOutoffLine>0</enableOutoffLine>" +
 *     "<isOnline>1</isOnline></OnlineUser></OnlineUserList>",
 * ).root;
 *
 * assertEquals(onlineUserList.decode(root).OnlineUser[0].userName, "admin");
 * ```
 *
 * @module
 */

import {
  int,
  obj,
  optional,
  repeated,
  text,
  type XmlParam,
  xmlParam,
} from "../xml.ts";

/** One logged-in session in `<OnlineUser>`. */
export type OnlineUser = {
  /** The user's index. */
  userId?: number;
  /** The session to act on; the only field the parser requires. */
  sessionId: number;
  /** Login name, up to 31 bytes. */
  userName?: string;
  /** Password; parsed only, never written. */
  password?: string;
  /** 0 or 1. */
  userLevel?: number;
  /** The session's client IP address. */
  ipAddress?: string;
  /** Always empty in the reply. */
  macAddress?: string;
  /**
   * 1 when the caller may force this session off; in cmd 121, 1 selects
   * the session.
   */
  enableOutoffLine?: number;
  /** Always 1 in the reply. */
  isOnline?: number;
};

/** The logged-in sessions in `<OnlineUserList>`. */
export type OnlineUserList = {
  /** Every session, as repeated `<OnlineUser>` elements; at most 20 parsed. */
  OnlineUser: OnlineUser[];
};

/**
 * Codec for `<OnlineUserList>`.
 *
 * @example Build a cmd 121 request
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { onlineUserList } from "@hertzg/reolink-api/protocol/params";
 *
 * assertEquals(
 *   onlineUserList.encode({
 *     OnlineUser: [{ sessionId: 17, enableOutoffLine: 1 }],
 *   }),
 *   '<OnlineUserList version="1.1"><OnlineUser><sessionId>17</sessionId>' +
 *     "<enableOutoffLine>1</enableOutoffLine></OnlineUser></OnlineUserList>",
 * );
 * ```
 */
export const onlineUserList: XmlParam<"OnlineUserList", OnlineUserList> =
  xmlParam("OnlineUserList", {
    OnlineUser: repeated(obj({
      userId: optional(int()),
      sessionId: int(),
      userName: optional(text()),
      password: optional(text()),
      userLevel: optional(int()),
      ipAddress: optional(text()),
      macAddress: optional(text()),
      enableOutoffLine: optional(int()),
      isOnline: optional(int()),
    })),
  });
