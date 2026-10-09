/**
 * `<Ddns>`: dynamic DNS settings. The camera replies with it to cmd 40
 * (`GET_DDNSCFG_V20`) and reads it from cmd 41 (`SET_DDNSCFG_V20`).
 *
 * Firmware: the cmd 40 handler writes every field when the stored provider
 * maps to a name, and fails the request otherwise. The parser
 * `nets_param_ddns_cfg_x2s` reads whichever fields are present, so none is
 * required, and rejects a provider outside the list.
 *
 * @example Read a cmd 40 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { ddns } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<Ddns version="1.1"><enable>0</enable><ddnsType>no-ip</ddnsType>' +
 *     "<ddnsName>cam.example.net</ddnsName><userName>ddns-user</userName>" +
 *     "<password>ddns-secret</password></Ddns>",
 * ).root;
 *
 * assertEquals(ddns.decode(root).ddnsType, "no-ip");
 * ```
 *
 * @module
 */

import { int, oneOf, optional, text, type XmlParam, xmlParam } from "../xml.ts";

/** The dynamic DNS settings in `<Ddns>`. */
export type Ddns = {
  /** 1 when on, 0 when off. */
  enable?: number;
  /** DDNS provider. */
  ddnsType?: "swann" | "dyndns" | "peatnuts" | "3322" | "no-ip";
  /** Host name to register, up to 255 bytes. */
  ddnsName?: string;
  /** Provider account name, up to 255 bytes. */
  userName?: string;
  /** Provider account password, up to 255 bytes. */
  password?: string;
};

/**
 * Codec for `<Ddns>`.
 *
 * @example Build a `<Ddns>` element for cmd 41
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { ddns } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = ddns.encode({ enable: 1, ddnsType: "dyndns" });
 *
 * assertStringIncludes(xml, "<ddnsType>dyndns</ddnsType>");
 * ```
 */
export const ddns: XmlParam<"Ddns", Ddns> = xmlParam("Ddns", {
  enable: optional(int()),
  ddnsType: optional(oneOf("swann", "dyndns", "peatnuts", "3322", "no-ip")),
  ddnsName: optional(text()),
  userName: optional(text()),
  password: optional(text()),
});
