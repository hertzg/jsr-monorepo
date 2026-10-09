/**
 * `<IOTBindUnBind>`: an IoT device to bind (cmd 391) or unbind (cmd 392),
 * with the credentials binding needs.
 *
 * Firmware: `net_bind_unbind_IoT_s2x` writes `name` and `uid`, always.
 * `net_bind_unbind_IoT_x2s` reads `name`, `uid`, `userName`, `password`,
 * `token` and `deviceType` when present and skips the rest, so each field
 * may be missing.
 *
 * @example Read a reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { iotBindUnBind } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<IOTBindUnBind version="1.1"><name>Porch light</name>' +
 *     "<uid>IOT0000ABCDEF12</uid></IOTBindUnBind>",
 * ).root;
 *
 * assertEquals(iotBindUnBind.decode(root).name, "Porch light");
 * ```
 *
 * @module
 */

import { int, optional, text, type XmlParam, xmlParam } from "../xml.ts";

/** An IoT device to bind or unbind, in `<IOTBindUnBind>`. */
export type IotBindUnBind = {
  /** Device name. */
  name?: string;
  /** Device uid. */
  uid?: string;
  /** Login user name; read from requests only. */
  userName?: string;
  /** Login password; read from requests only. */
  password?: string;
  /** Access token; read from requests only. */
  token?: string;
  /** Device type as a number; read from requests only. */
  deviceType?: number;
};

/**
 * Codec for `<IOTBindUnBind>`.
 *
 * @example Bind a device
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { iotBindUnBind } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = iotBindUnBind.encode({
 *   name: "Porch light",
 *   uid: "IOT0000ABCDEF12",
 *   userName: "admin",
 *   password: "secret",
 *   deviceType: 1,
 * });
 *
 * assertStringIncludes(xml, "<userName>admin</userName>");
 * ```
 */
export const iotBindUnBind: XmlParam<"IOTBindUnBind", IotBindUnBind> = xmlParam(
  "IOTBindUnBind",
  {
    name: optional(text()),
    uid: optional(text()),
    userName: optional(text()),
    password: optional(text()),
    token: optional(text()),
    deviceType: optional(int()),
  },
);
