/**
 * `<WifiSignal>`: the Wi-Fi signal strength of the camera's current link.
 * Sent in the reply to cmd 115.
 *
 * Firmware: `net_wifi_signal_s2x` always writes `signal`.
 *
 * @example Read the cmd 115 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { wifiSignal } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<WifiSignal version="1.1"><signal>78</signal></WifiSignal>',
 * ).root;
 *
 * assertEquals(wifiSignal.decode(root).signal, 78);
 * ```
 *
 * @module
 */

import { int, type XmlParam, xmlParam } from "../xml.ts";

/** The Wi-Fi signal strength in `<WifiSignal>`. */
export type WifiSignal = {
  /** Signal strength as the firmware reports it. */
  signal: number;
};

/**
 * Codec for `<WifiSignal>`.
 *
 * @example Build a `<WifiSignal>` element
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { wifiSignal } from "@hertzg/reolink-api/protocol/params";
 *
 * assertEquals(
 *   wifiSignal.encode({ signal: 42 }),
 *   '<WifiSignal version="1.1"><signal>42</signal></WifiSignal>',
 * );
 * ```
 */
export const wifiSignal: XmlParam<"WifiSignal", WifiSignal> = xmlParam(
  "WifiSignal",
  {
    signal: int(),
  },
);
