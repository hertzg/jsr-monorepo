/**
 * `<Net3g4gModuleInfo>`: the cellular module's SIM and modem identifiers,
 * read with cmd 257.
 *
 * Firmware: `net_4g_module_info_s2x` writes every field, always. The
 * netserver parser reads whichever fields are present, so every field is
 * optional.
 *
 * @example Read a cmd 257 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { net3g4gModuleInfo } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<Net3g4gModuleInfo version="1.1"><iccid>8944501234567890123</iccid>' +
 *     "<imei>356938035643809</imei><phoneNumber>+15551234567</phoneNumber>" +
 *     "</Net3g4gModuleInfo>",
 * ).root;
 *
 * assertEquals(net3g4gModuleInfo.decode(root).imei, "356938035643809");
 * ```
 *
 * @module
 */

import { optional, text, type XmlParam, xmlParam } from "../xml.ts";

/** The cellular module identifiers in `<Net3g4gModuleInfo>`. */
export type Net3g4gModuleInfo = {
  /** SIM card ICCID. */
  iccid?: string;
  /** Modem IMEI. */
  imei?: string;
  /** SIM phone number. */
  phoneNumber?: string;
};

/**
 * Codec for `<Net3g4gModuleInfo>`.
 *
 * @example Build a `<Net3g4gModuleInfo>` element
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { net3g4gModuleInfo } from "@hertzg/reolink-api/protocol/params";
 *
 * assertEquals(
 *   net3g4gModuleInfo.encode({ imei: "490154203237518" }),
 *   '<Net3g4gModuleInfo version="1.1"><imei>490154203237518</imei></Net3g4gModuleInfo>',
 * );
 * ```
 */
export const net3g4gModuleInfo: XmlParam<
  "Net3g4gModuleInfo",
  Net3g4gModuleInfo
> = xmlParam("Net3g4gModuleInfo", {
  iccid: optional(text()),
  imei: optional(text()),
  phoneNumber: optional(text()),
});
