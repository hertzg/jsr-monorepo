/**
 * `<LoginUser>`: the credentials sent with the login (cmd 1) and logout
 * (cmd 2).
 *
 * Firmware: `net_login_info_x2s` reads every field as optional. Inside
 * `<scopes>`, each `<item>` must carry a `channelId` (-1 for all channels,
 * otherwise 0 to 16) and may carry `privileges`. No serializer for it was
 * found, so the shape is the request the camera accepts.
 *
 * @example Read a login
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { loginUser } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<LoginUser version="1.1"><userName>USER_HASH</userName>' +
 *     "<password>PASS_HASH</password><userVer>1</userVer></LoginUser>",
 * ).root;
 *
 * assertEquals(loginUser.decode(root).userVer, 1);
 * ```
 *
 * @module
 */

import {
  int,
  list,
  obj,
  optional,
  text,
  type XmlParam,
  xmlParam,
} from "../xml.ts";

/** The login credentials in `<LoginUser>`. */
export type LoginUser = {
  /** User name, or its hash; up to 31 characters. */
  userName?: string;
  /** Password, or its hash; up to 31 characters. */
  password?: string;
  /** Login scheme version. */
  userVer?: number;
  /** Special-handling flag. */
  handleSpecial?: number;
  /** Signature of a token login; up to 63 characters. */
  authSignature?: string;
  /** Token of a token login; up to 63 characters. */
  authToken?: string;
  /** User of a token login; up to 31 characters. */
  authUser?: string;
  /** Admin flag. */
  admin?: number;
  /** Per-channel privileges of a token login. */
  scopes?: {
    /** Zero-based channel, or -1 for all channels. */
    channelId: number;
    /** Privilege list as text; up to 127 characters. */
    privileges?: string;
  }[];
};

/**
 * Codec for `<LoginUser>`.
 *
 * @example Build a `<LoginUser>` element
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { loginUser } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = loginUser.encode({
 *   userName: "USER_HASH",
 *   password: "PASS_HASH",
 *   userVer: 1,
 * });
 *
 * assertStringIncludes(xml, "<password>PASS_HASH</password>");
 * ```
 */
export const loginUser: XmlParam<"LoginUser", LoginUser> = xmlParam(
  "LoginUser",
  {
    userName: optional(text()),
    password: optional(text()),
    userVer: optional(int()),
    handleSpecial: optional(int()),
    authSignature: optional(text()),
    authToken: optional(text()),
    authUser: optional(text()),
    admin: optional(int()),
    scopes: optional(list(
      "item",
      obj({ channelId: int(), privileges: optional(text()) }),
    )),
  },
);
