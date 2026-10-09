/**
 * `<UserList>`: the camera's user accounts. The camera replies with it to
 * cmd 58 (`GET_USERCFG_V20`) and reads it from cmd 59 (`SET_USERCFG_V20`).
 *
 * Firmware: the cmd 58 handler writes one `<User>` per account with every
 * field except `password`, and always writes `userSetState` as `none`. The
 * parser `nets_user_cfg_x2s` reads up to 20 `<User>` elements, each needing
 * `userId` or `userName`; `userSetState` says what to do with the account.
 *
 * @example Read a cmd 58 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { userList } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<UserList version="1.1"><User><userId>0</userId>' +
 *     "<userName>admin</userName><userLevel>1</userLevel>" +
 *     "<loginState>1</loginState><userSetState>none</userSetState>" +
 *     "</User></UserList>",
 * ).root;
 *
 * assertEquals(userList.decode(root).User[0].userName, "admin");
 * ```
 *
 * @module
 */

import {
  int,
  obj,
  oneOf,
  optional,
  repeated,
  text,
  type XmlParam,
  xmlParam,
} from "../xml.ts";

/** One account in `<UserList>`. */
export type UserListUser = {
  /** Account number, 0 or more. */
  userId?: number;
  /** Account name, up to 31 bytes. */
  userName?: string;
  /** 0 or 1; the camera rejects anything above 1. */
  userLevel?: number;
  /** 1 for the account this session logged in as, else 0. */
  loginState?: number;
  /** What a request does with the account; replies always say `none`. */
  userSetState?: "none" | "add" | "delete" | "modify";
  /** Account password, up to 31 bytes; read by the parser, never written. */
  password?: string;
};

/** The user accounts in `<UserList>`. */
export type UserList = {
  /** One `<User>` per account. */
  User: UserListUser[];
};

/**
 * Codec for `<UserList>`.
 *
 * @example Build a `<UserList>` for cmd 59 that adds an account
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { userList } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = userList.encode({
 *   User: [{ userName: "viewer", userSetState: "add", password: "s3cret" }],
 * });
 *
 * assertStringIncludes(xml, "<userSetState>add</userSetState>");
 * ```
 */
export const userList: XmlParam<"UserList", UserList> = xmlParam("UserList", {
  User: repeated(obj({
    userId: optional(int()),
    userName: optional(text()),
    userLevel: optional(int()),
    loginState: optional(int()),
    userSetState: optional(oneOf("none", "add", "delete", "modify")),
    password: optional(text()),
  })),
});
