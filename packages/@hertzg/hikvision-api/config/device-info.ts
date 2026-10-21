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
 * import { parseDeviceInfo } from "@hertzg/hikvision-api/config/device-info";
 *
 * const info = parseDeviceInfo(
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

import { type RequestOptions, requestXml } from "../request.ts";
import { parseIsapi, requireText, text } from "../xml.ts";
import type { XmlElement } from "@std/xml";

/** The device info path. */
export const DEVICE_INFO_PATH = "/ISAPI/System/deviceInfo";

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
 * Parses a `<DeviceInfo>` document.
 *
 * @param xml The document text.
 * @returns The device info. `model`, `firmwareVersion` and `deviceType` are
 *   required; the rest appear when the device sends them.
 * @throws {IsapiError} When the document is a failing `<ResponseStatus>`.
 * @throws {Error} When a required field is missing.
 *
 * @example Optional fields are left out when absent
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseDeviceInfo } from "@hertzg/hikvision-api/config/device-info";
 *
 * const info = parseDeviceInfo(
 *   "<DeviceInfo><model>DS-2CD2043G2-I</model>" +
 *     "<firmwareVersion>V5.7.3</firmwareVersion><deviceType>IPCamera</deviceType></DeviceInfo>",
 * );
 *
 * assertEquals(info.serialNumber, undefined);
 * ```
 */
export function parseDeviceInfo(xml: string): DeviceInfo {
  return deviceInfo(parseIsapi(xml));
}

/**
 * Reads the device info from a device.
 *
 * @param options Where the device is and how to log in.
 * @returns The device info.
 * @throws {HttpError} When the device answers with a status outside 2xx.
 * @throws {IsapiError} When the device answers a failing `<ResponseStatus>`.
 *
 * @example Read through a stubbed fetch
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { resolvesNext, spy } from "@std/testing/mock";
 * import { readDeviceInfo } from "@hertzg/hikvision-api/config/device-info";
 *
 * const fetch = spy(resolvesNext([
 *   new Response(
 *     "<DeviceInfo><model>DS-2CD2043G2-I</model>" +
 *       "<firmwareVersion>V5.7.3</firmwareVersion><deviceType>IPCamera</deviceType></DeviceInfo>",
 *   ),
 * ]));
 *
 * const info = await readDeviceInfo({
 *   baseUrl: "http://192.0.2.21",
 *   username: "admin",
 *   password: "hunter2",
 *   fetch,
 * });
 *
 * assertEquals(info.deviceType, "IPCamera");
 * assertEquals(fetch.calls[0].args[0], "http://192.0.2.21/ISAPI/System/deviceInfo");
 * ```
 */
export async function readDeviceInfo(
  options: RequestOptions,
): Promise<DeviceInfo> {
  return deviceInfo(await requestXml(options, DEVICE_INFO_PATH));
}

function deviceInfo(root: XmlElement): DeviceInfo {
  const info: DeviceInfo = {
    model: requireText(root, "model"),
    firmwareVersion: requireText(root, "firmwareVersion"),
    deviceType: requireText(root, "deviceType"),
  };
  const optional = {
    deviceName: text(root, "deviceName"),
    deviceID: text(root, "deviceID"),
    serialNumber: text(root, "serialNumber"),
    macAddress: text(root, "macAddress"),
    firmwareReleasedDate: text(root, "firmwareReleasedDate"),
  };
  for (const [key, value] of Object.entries(optional)) {
    if (value !== undefined) {
      Object.assign(info, { [key]: value });
    }
  }
  return info;
}
