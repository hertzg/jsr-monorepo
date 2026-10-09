/**
 * `<Wifi>`: the camera's Wi-Fi client settings and the access points it has
 * seen. Read with cmd 116, written with cmd 117 and tested with cmd 200.
 *
 * Firmware: `net_wifi_s2x` in the RLC-823A and the Video Doorbell PoE
 * firmware always writes `freqPolicy`, `ssid`, `key`, `channel` and
 * `countryCode`. Only the RLC-823A writes `protocol` and `type`, at the top
 * level and in each `<udid>`; the Video Doorbell PoE writes `type` in each
 * `<udid>` only. Both write `mode` only for a known mode, `udidList` only
 * when access points were found, and `staticSsid`/`staticKey` only on a
 * Wi-Fi kit model. `net_wifi_x2s` in both reads every field it knows when
 * present and skips the rest, so none is required in a request. It also
 * reads `authMode` and `encryptType`, which the serializer never writes, and
 * ignores `protocol` and `type`. The Video Doorbell PoE parser also reads
 * `scanAp`, first, which neither serializer writes.
 *
 * @example Read the cmd 116 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { wifi } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<Wifi version="1.1"><freqPolicy>0</freqPolicy><protocol>0</protocol>' +
 *     "<mode>station</mode><ssid>HomeNet</ssid><key>secret-key</key>" +
 *     "<channel>6</channel><type>0</type><countryCode>US</countryCode></Wifi>",
 * ).root;
 *
 * assertEquals(wifi.decode(root).ssid, "HomeNet");
 * ```
 *
 * @module
 */

import {
  int,
  list,
  obj,
  oneOf,
  optional,
  text,
  type XmlParam,
  xmlParam,
} from "../xml.ts";

/** One access point in `<udidList>`, as a `<udid>` element. */
export type WifiUdid = {
  /** The access point's SSID; the parser reads it when present. */
  name?: string;
  /** Signal strength; the parser drops an entry below 1. */
  signal?: number;
  /** Encryption as a number; written only, never parsed. */
  encrypt?: number;
  /** Network type as a number; written only, never parsed. */
  type?: number;
  /** Wireless protocol as a number; RLC-823A only, never parsed. */
  protocol?: number;
};

/** The Wi-Fi client settings in `<Wifi>`. */
export type Wifi = {
  /**
   * Meaning not recovered beyond the name; Video Doorbell PoE only; read
   * from requests, never written.
   */
  scanAp?: number;
  /** Frequency band policy as a number. */
  freqPolicy?: number;
  /** Wireless protocol as a number; RLC-823A only, never parsed. */
  protocol?: number;
  /** Client or access point mode; the firmware omits it for another value. */
  mode?: "station" | "ap";
  /** Authentication mode; parsed only, never written. */
  authMode?: "open" | "shared" | "wpapsk" | "wpa2psk" | "detect";
  /** Encryption type; parsed only, never written. */
  encryptType?: "none" | "wep" | "tkip" | "aes" | "detect";
  /** Access points found by a scan, at most 128; omitted when none. */
  udidList?: WifiUdid[];
  /** Network name, up to 256 bytes. */
  ssid?: string;
  /** Network key, up to 256 bytes. */
  key?: string;
  /** Wi-Fi channel. */
  channel?: number;
  /** Network type as a number; RLC-823A only, never parsed. */
  type?: number;
  /** Fallback network name; written only on a Wi-Fi kit model. */
  staticSsid?: string;
  /** Fallback network key; written only on a Wi-Fi kit model. */
  staticKey?: string;
  /** Regulatory country code. */
  countryCode?: string;
};

/**
 * Codec for `<Wifi>`.
 *
 * @example Build a cmd 117 request
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { wifi } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = wifi.encode({
 *   mode: "station",
 *   authMode: "wpa2psk",
 *   encryptType: "aes",
 *   ssid: "HomeNet",
 *   key: "secret-key",
 * });
 *
 * assertStringIncludes(xml, "<authMode>wpa2psk</authMode>");
 * ```
 */
export const wifi: XmlParam<"Wifi", Wifi> = xmlParam("Wifi", {
  scanAp: optional(int()),
  freqPolicy: optional(int()),
  protocol: optional(int()),
  mode: optional(oneOf("station", "ap")),
  authMode: optional(oneOf("open", "shared", "wpapsk", "wpa2psk", "detect")),
  encryptType: optional(oneOf("none", "wep", "tkip", "aes", "detect")),
  udidList: optional(list(
    "udid",
    obj({
      name: optional(text()),
      signal: optional(int()),
      encrypt: optional(int()),
      type: optional(int()),
      protocol: optional(int()),
    }),
  )),
  ssid: optional(text()),
  key: optional(text()),
  channel: optional(int()),
  type: optional(int()),
  staticSsid: optional(text()),
  staticKey: optional(text()),
  countryCode: optional(text()),
});
