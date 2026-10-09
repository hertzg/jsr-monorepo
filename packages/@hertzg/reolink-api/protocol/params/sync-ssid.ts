/**
 * `<syncSSID>`: Wi-Fi network names to sync to the camera (cmd 513).
 * Request only: no firmware code writes it.
 *
 * Firmware: `net_param_sync_ssid_x2s` reads `ssid2Dot4G` and `ssid5G` when
 * present and skips the rest, so each field may be missing.
 *
 * @example Sync both bands
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { syncSsid } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = syncSsid.encode({ ssid2Dot4G: "Home", ssid5G: "Home-5G" });
 *
 * assertStringIncludes(xml, "<ssid5G>Home-5G</ssid5G>");
 * ```
 *
 * @module
 */

import { optional, text, type XmlParam, xmlParam } from "../xml.ts";

/** The Wi-Fi network names in `<syncSSID>`. */
export type SyncSsid = {
  /** 2.4 GHz network name, up to 127 characters. */
  ssid2Dot4G?: string;
  /** 5 GHz network name, up to 127 characters. */
  ssid5G?: string;
};

/**
 * Codec for `<syncSSID>`.
 *
 * @example Read back a request
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { syncSsid } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<syncSSID version="1.1"><ssid2Dot4G>Home</ssid2Dot4G></syncSSID>',
 * ).root;
 *
 * assertEquals(syncSsid.decode(root), { ssid2Dot4G: "Home" });
 * ```
 */
export const syncSsid: XmlParam<"syncSSID", SyncSsid> = xmlParam("syncSSID", {
  ssid2Dot4G: optional(text()),
  ssid5G: optional(text()),
});
