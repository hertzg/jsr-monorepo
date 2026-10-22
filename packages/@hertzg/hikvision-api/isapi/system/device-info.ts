/**
 * `/ISAPI/System/deviceInfo`: what the device is.
 *
 * ```xml
 * <DeviceInfo version="2.0" xmlns="http://www.hikvision.com/ver20/XMLSchema">
 * <deviceName>Embedded Net DVR</deviceName>
 * <deviceID>…</deviceID>
 * <model>DS-7608NI-Q2/8P</model>
 * <serialNumber>…</serialNumber>
 * <macAddress>02:00:00:00:00:01</macAddress>
 * <firmwareVersion>V4.75.207</firmwareVersion>
 * <firmwareReleasedDate>build 250101</firmwareReleasedDate>
 * <deviceType>NVR</deviceType>
 * </DeviceInfo>
 * ```
 *
 * @example Parse a device info document
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { deviceInfo } from "./device-info.ts";
 *
 * const info = deviceInfo.codec.parse(
 *   "<DeviceInfo><deviceName>Embedded Net DVR</deviceName>" +
 *     "<model>DS-7608NI-Q2/8P</model><firmwareVersion>V4.75.207</firmwareVersion>" +
 *     "<deviceType>NVR</deviceType></DeviceInfo>",
 * );
 *
 * assertEquals(info, {
 *   deviceName: "Embedded Net DVR",
 *   model: "DS-7608NI-Q2/8P",
 *   firmwareVersion: "V4.75.207",
 *   deviceType: "NVR",
 * });
 * ```
 *
 * @module
 */

import { document, optional, text } from "../document.ts";
import type { Resource } from "../request.ts";

/** The fields of `<DeviceInfo>`. */
export type DeviceInfo = {
  /** `<deviceName>`, as set by the owner. */
  deviceName?: string;
  /** `<deviceID>`, a UUID. */
  deviceID?: string;
  /** `<model>`, such as `DS-7608NI-Q2/8P`. */
  model: string;
  /** `<serialNumber>`. */
  serialNumber?: string;
  /** `<macAddress>`. */
  macAddress?: string;
  /** `<firmwareVersion>`, such as `V4.75.207`. */
  firmwareVersion: string;
  /** `<firmwareReleasedDate>`, such as `build 250101`. */
  firmwareReleasedDate?: string;
  /** `<deviceType>`: `NVR`, `IPCamera` or another ISAPI device type. */
  deviceType: string;
};

/**
 * The device info resource, `/ISAPI/System/deviceInfo`.
 *
 * `model`, `firmwareVersion` and `deviceType` are always present; the rest are
 * left out when the device does not send them. Parsing throws an `Error` when a
 * required field is missing and an `IsapiError` on a failing `<ResponseStatus>`.
 *
 * @example Read through a stubbed fetch
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { resolvesNext, spy } from "@std/testing/mock";
 * import { read } from "../request.ts";
 * import { deviceInfo } from "./device-info.ts";
 *
 * const fetch = spy(resolvesNext([
 *   new Response(
 *     "<DeviceInfo><model>DS-2CD2043G2-I</model>" +
 *       "<firmwareVersion>V5.7.3</firmwareVersion><deviceType>IPCamera</deviceType></DeviceInfo>",
 *   ),
 * ]));
 *
 * const info = await read({
 *   baseUrl: "http://192.0.2.21",
 *   username: "admin",
 *   password: "hunter2",
 *   fetch,
 * }, deviceInfo);
 *
 * assertEquals(info.deviceType, "IPCamera");
 * assertEquals(info.serialNumber, undefined);
 * assertEquals(fetch.calls[0].args[0], "http://192.0.2.21/ISAPI/System/deviceInfo");
 * ```
 */
export const deviceInfo: Resource<DeviceInfo> = {
  path: "/ISAPI/System/deviceInfo",
  codec: document({
    model: text(),
    firmwareVersion: text(),
    deviceType: text(),
    deviceName: optional(text()),
    deviceID: optional(text()),
    serialNumber: optional(text()),
    macAddress: optional(text()),
    firmwareReleasedDate: optional(text()),
  }),
};
