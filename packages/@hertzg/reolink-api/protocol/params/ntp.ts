/**
 * `<Ntp>`: network time sync settings. The camera replies with it to cmd 38
 * (`GET_NTPCFG_V20`) and reads it from cmd 39 (`SET_NTPCFG_V20`).
 *
 * Firmware: the cmd 38 handler writes every field, always. The parser
 * `nets_param_ntp_cfg_x2s` reads whichever fields are present, so none is
 * required.
 *
 * @example Read a cmd 38 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { ntp } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<Ntp version="1.1"><enable>1</enable><server>pool.ntp.org</server>' +
 *     "<synchronizeInterval>1440</synchronizeInterval><port>123</port></Ntp>",
 * ).root;
 *
 * assertEquals(ntp.decode(root).server, "pool.ntp.org");
 * ```
 *
 * @module
 */

import { int, optional, text, type XmlParam, xmlParam } from "../xml.ts";

/** The time sync settings in `<Ntp>`. */
export type Ntp = {
  /** 1 when sync is on, 0 when off. */
  enable?: number;
  /** NTP server host name or address, up to 255 bytes. */
  server?: string;
  /** Sync interval, in the camera's units. */
  synchronizeInterval?: number;
  /** NTP server port, 0 to 65535. */
  port?: number;
};

/**
 * Codec for `<Ntp>`.
 *
 * @example Build an `<Ntp>` element for cmd 39
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { ntp } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = ntp.encode({ enable: 1, server: "time.example.com", port: 123 });
 *
 * assertStringIncludes(xml, "<server>time.example.com</server>");
 * ```
 */
export const ntp: XmlParam<"Ntp", Ntp> = xmlParam("Ntp", {
  enable: optional(int()),
  server: optional(text()),
  synchronizeInterval: optional(int()),
  port: optional(int()),
});
