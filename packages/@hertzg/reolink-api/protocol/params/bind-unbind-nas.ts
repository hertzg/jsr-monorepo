/**
 * `<BindUnbindNas>`: the NAS to bind (cmd 279) or unbind (cmd 280), with the
 * credentials to reach it.
 *
 * Firmware: `net_bind_unbind_nas_x2s` reads `userName`, `password`,
 * `devName`, `uid` and `token`, skipping any that are missing.
 * `net_bind_unbind_nas_s2x` writes only `devName` and `uid`. Every field is
 * optional.
 *
 * @example Read the device the camera echoes back
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { bindUnbindNas } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<BindUnbindNas version="1.1"><devName>Basement NAS</devName>' +
 *     "<uid>95270000ABCDEF12</uid></BindUnbindNas>",
 * ).root;
 *
 * assertEquals(bindUnbindNas.decode(root).devName, "Basement NAS");
 * ```
 *
 * @module
 */

import { optional, text, type XmlParam, xmlParam } from "../xml.ts";

/** The NAS bind request in `<BindUnbindNas>`. */
export type BindUnbindNas = {
  /** NAS login name; read only, never written back. */
  userName?: string;
  /** NAS login password; read only, never written back. */
  password?: string;
  /** NAS device name. */
  devName?: string;
  /** NAS device UID. */
  uid?: string;
  /** NAS access token; read only, never written back. */
  token?: string;
};

/**
 * Codec for `<BindUnbindNas>`.
 *
 * @example Build a bind request
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { bindUnbindNas } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = bindUnbindNas.encode({
 *   userName: "admin",
 *   password: "nas-secret",
 *   devName: "Basement NAS",
 *   uid: "95270000ABCDEF12",
 * });
 *
 * assertStringIncludes(xml, "<uid>95270000ABCDEF12</uid>");
 * ```
 */
export const bindUnbindNas: XmlParam<"BindUnbindNas", BindUnbindNas> = xmlParam(
  "BindUnbindNas",
  {
    userName: optional(text()),
    password: optional(text()),
    devName: optional(text()),
    uid: optional(text()),
    token: optional(text()),
  },
);
