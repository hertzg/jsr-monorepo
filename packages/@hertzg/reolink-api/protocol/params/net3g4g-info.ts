/**
 * `<Net3g4gInfo>`: the cellular signal and network. Read with cmd 256, and
 * pushed unasked as cmd 255 on cameras with a 4G module.
 *
 * Firmware: `net_4g_net_info_s2x` (the cmd 256 reply) and
 * `nets_4g_net_info_report` (the cmd 255 push) both write every field,
 * always. No firmware code reads this element.
 *
 * @example Read the cmd 255 push
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { net3g4gInfo } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<Net3g4gInfo version="1.1"><sigIntensityLevel>4</sigIntensityLevel>' +
 *     "<sigIntensityValue>-71</sigIntensityValue><netMode>4</netMode>" +
 *     "<mobileOperator>1</mobileOperator></Net3g4gInfo>",
 * ).root;
 *
 * assertEquals(net3g4gInfo.decode(root).sigIntensityValue, -71);
 * ```
 *
 * @module
 */

import { int, type XmlParam, xmlParam } from "../xml.ts";

/** The cellular state in `<Net3g4gInfo>`. */
export type Net3g4gInfo = {
  /** Signal strength as a level. */
  sigIntensityLevel: number;
  /** Signal strength as a raw value. */
  sigIntensityValue: number;
  /** Network mode, as a number. */
  netMode: number;
  /** Mobile operator, as a number. */
  mobileOperator: number;
};

/**
 * Codec for `<Net3g4gInfo>`.
 *
 * @example Build a `<Net3g4gInfo>` element
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { net3g4gInfo } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = net3g4gInfo.encode({
 *   sigIntensityLevel: 2,
 *   sigIntensityValue: -95,
 *   netMode: 3,
 *   mobileOperator: 10,
 * });
 *
 * assertStringIncludes(xml, "<sigIntensityLevel>2</sigIntensityLevel>");
 * ```
 */
export const net3g4gInfo: XmlParam<"Net3g4gInfo", Net3g4gInfo> = xmlParam(
  "Net3g4gInfo",
  {
    sigIntensityLevel: int(),
    sigIntensityValue: int(),
    netMode: int(),
    mobileOperator: int(),
  },
);
