/**
 * `<PerformanceInfo>`: CPU load and stream bitrates. Sent in the reply to
 * cmd 122.
 *
 * Firmware: `nets_performance_info_s2x` writes every field, always.
 *
 * @example Read the cmd 122 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { performanceInfo } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<PerformanceInfo version="1.1"><cpuUseRate>37</cpuUseRate>' +
 *     "<codeRate>4096</codeRate><netDataRate>512</netDataRate></PerformanceInfo>",
 * ).root;
 *
 * assertEquals(performanceInfo.decode(root).cpuUseRate, 37);
 * ```
 *
 * @module
 */

import { int, type XmlParam, xmlParam } from "../xml.ts";

/** CPU load and bitrates in `<PerformanceInfo>`. */
export type PerformanceInfo = {
  /** CPU usage. */
  cpuUseRate: number;
  /** Total encoder bitrate. */
  codeRate: number;
  /** Network data rate. */
  netDataRate: number;
};

/**
 * Codec for `<PerformanceInfo>`.
 *
 * @example Build a `<PerformanceInfo>` element
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { performanceInfo } from "@hertzg/reolink-api/protocol/params";
 *
 * assertEquals(
 *   performanceInfo.encode({ cpuUseRate: 12, codeRate: 2048, netDataRate: 256 }),
 *   '<PerformanceInfo version="1.1"><cpuUseRate>12</cpuUseRate>' +
 *     "<codeRate>2048</codeRate><netDataRate>256</netDataRate></PerformanceInfo>",
 * );
 * ```
 */
export const performanceInfo: XmlParam<"PerformanceInfo", PerformanceInfo> =
  xmlParam("PerformanceInfo", {
    cpuUseRate: int(),
    codeRate: int(),
    netDataRate: int(),
  });
