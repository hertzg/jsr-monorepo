/**
 * `<NetworkDiagnosisData>`: a network diagnosis data file (cmd 357), named
 * with its size.
 *
 * Firmware: the netserver handler for cmd 357 writes `fileName` and `size`,
 * always. `net_network_diagnosis_data_x2s` reads `channelId` (rejecting
 * negative values), `fileName` and `size` when present and skips the rest,
 * so each field may be missing.
 *
 * @example Read the cmd 357 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { networkDiagnosisData } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<NetworkDiagnosisData version="1.1"><fileName>diag.tar.gz</fileName>' +
 *     "<size>20480</size></NetworkDiagnosisData>",
 * ).root;
 *
 * assertEquals(networkDiagnosisData.decode(root).size, 20480);
 * ```
 *
 * @module
 */

import { int, optional, text, type XmlParam, xmlParam } from "../xml.ts";

/** A network diagnosis data file, in `<NetworkDiagnosisData>`. */
export type NetworkDiagnosisData = {
  /** Zero-based channel; read from requests only. */
  channelId?: number;
  /** File name, up to 127 characters. */
  fileName?: string;
  /** File size in bytes. */
  size?: number;
};

/**
 * Codec for `<NetworkDiagnosisData>`.
 *
 * @example Ask for the diagnosis data of channel 0
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { networkDiagnosisData } from "@hertzg/reolink-api/protocol/params";
 *
 * assertEquals(
 *   networkDiagnosisData.encode({ channelId: 0 }),
 *   '<NetworkDiagnosisData version="1.1"><channelId>0</channelId></NetworkDiagnosisData>',
 * );
 * ```
 */
export const networkDiagnosisData: XmlParam<
  "NetworkDiagnosisData",
  NetworkDiagnosisData
> = xmlParam("NetworkDiagnosisData", {
  channelId: optional(int()),
  fileName: optional(text()),
  size: optional(int()),
});
