/**
 * `/ISAPI/ContentMgmt/InputProxy/channels/status`: whether each IP camera
 * behind an NVR is reachable, and why not.
 *
 * NVR only. A camera answers this path with a failing `<ResponseStatus>`.
 *
 * ```xml
 * <InputProxyChannelStatusList version="1.0" xmlns="http://www.hikvision.com/ver20/XMLSchema">
 * <InputProxyChannelStatus version="1.0" xmlns="http://www.hikvision.com/ver20/XMLSchema">
 * <id>1</id>
 * <sourceInputPortDescriptor>
 * <proxyProtocol>HIKVISION</proxyProtocol>
 * <addressingFormatType>ipaddress</addressingFormatType>
 * <ipAddress>192.0.2.21</ipAddress>
 * <managePortNo>8000</managePortNo>
 * <srcInputPort>1</srcInputPort>
 * <userName>admin</userName>
 * <connMode>plugplay</connMode>
 * <streamType>auto</streamType>
 * </sourceInputPortDescriptor>
 * <online>true</online>
 * <streamingProxyChannelIdList>
 * <streamingProxyChannelId>101</streamingProxyChannelId>
 * <streamingProxyChannelId>102</streamingProxyChannelId>
 * </streamingProxyChannelIdList>
 * <chanDetectResult>connect</chanDetectResult>
 * <url>http://192.0.2.10:65001</url>
 * <SecurityStatus><PasswordStatus>strong</PasswordStatus></SecurityStatus>
 * </InputProxyChannelStatus>
 * </InputProxyChannelStatusList>
 * ```
 *
 * @example Parse a channel status list
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseInputProxyChannelStatus } from "@hertzg/hikvision-api/config/channel-status";
 *
 * const status = parseInputProxyChannelStatus(
 *   "<InputProxyChannelStatusList><InputProxyChannelStatus><id>1</id>" +
 *     "<sourceInputPortDescriptor><ipAddress>192.0.2.21</ipAddress>" +
 *     "</sourceInputPortDescriptor><online>true</online>" +
 *     "<chanDetectResult>connect</chanDetectResult>" +
 *     "<url>http://192.0.2.10:65001</url>" +
 *     "</InputProxyChannelStatus></InputProxyChannelStatusList>",
 * );
 *
 * assertEquals(status, [{
 *   id: 1,
 *   online: true,
 *   chanDetectResult: "connect",
 *   url: "http://192.0.2.10:65001",
 *   ipAddress: "192.0.2.21",
 * }]);
 * ```
 *
 * @module
 */

import { type RequestOptions, requestXml } from "../request.ts";
import {
  element,
  elements,
  parseIsapi,
  parseNumber,
  present,
  requireText,
  text,
  textContent,
} from "../xml.ts";
import type { XmlElement } from "@std/xml";

/** The input proxy channel status path. */
export const INPUT_PROXY_CHANNEL_STATUS_PATH =
  "/ISAPI/ContentMgmt/InputProxy/channels/status";

/** One `<InputProxyChannelStatus>`: the NVR's view of one IP camera. */
export type InputProxyChannelStatus = {
  /** `<id>`, the channel number from 1. */
  id: number;
  /** `<online>`: whether the NVR is receiving the camera's stream. */
  online: boolean;
  /**
   * `<chanDetectResult>`: why the camera is in the state it is in.
   *
   * `connect` when online. Otherwise one of `connecting`, `overSysBandwidth`,
   * `domainError`, `ipcStreamFail`, `chanNoError`, `ipAddrConflictWithDev`,
   * `ipAddrConflicWithIpc`, `errorUserNameOrPasswd`, `netUnreachable`,
   * `unknownError`, `notExist`, `ipcStreamTypeNotSupport`,
   * `ipcResolutionNotSupport`, `userLocked`, `userNotExist`,
   * `ipcUnregistered`, `ipcNotActivated` or `poePortDetecting`. Newer
   * firmware adds `ipcResolutionOverflow`, `ipcBitrateOverflow`,
   * `unopenedHighResolutionMode`, `accessFroDeviceParamFailure` and
   * `certificateValidationError`.
   */
  chanDetectResult?: string;
  /**
   * `<url>`: the camera's web address. For a plug-and-play camera this is
   * the NVR's virtual host, such as `http://192.0.2.10:65001` for PoE port 1.
   */
  url?: string;
  /** `<ipAddress>` of the camera. */
  ipAddress?: string;
  /** `<proxyProtocol>`, such as `HIKVISION` or `ONVIF`. */
  proxyProtocol?: string;
  /** `<managePortNo>` of the camera, usually `8000`. */
  managePortNo?: number;
  /** `<srcInputPort>`: which of the camera's inputs this channel shows. */
  srcInputPort?: number;
  /** `<connMode>`: `plugplay` for a PoE camera, `manual` for one added by address. */
  connMode?: string;
  /** `<SecurityStatus><PasswordStatus>`: `strong`, `medium`, `weak` or `risk`. */
  passwordStatus?: string;
  /**
   * `<streamingProxyChannelIdList>`: the streaming channel numbers that play
   * this camera, such as `101` (main stream) and `102` (sub stream).
   */
  streamingProxyChannelIds?: number[];
};

/**
 * Parses an `<InputProxyChannelStatusList>` document.
 *
 * @param xml The document text.
 * @returns The channel statuses in document order.
 * @throws {IsapiError} When the document is a failing `<ResponseStatus>`.
 *
 * @example An offline channel without firmware extras
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseInputProxyChannelStatus } from "@hertzg/hikvision-api/config/channel-status";
 *
 * const status = parseInputProxyChannelStatus(
 *   "<InputProxyChannelStatusList><InputProxyChannelStatus><id>3</id>" +
 *     "<online>false</online><chanDetectResult>netUnreachable</chanDetectResult>" +
 *     "</InputProxyChannelStatus></InputProxyChannelStatusList>",
 * );
 *
 * assertEquals(status, [{ id: 3, online: false, chanDetectResult: "netUnreachable" }]);
 * ```
 */
export function parseInputProxyChannelStatus(
  xml: string,
): InputProxyChannelStatus[] {
  return inputProxyChannelStatus(parseIsapi(xml));
}

/**
 * Reads the channel status list from an NVR.
 *
 * @param options Where the NVR is and how to log in.
 * @returns The channel statuses in document order.
 * @throws {HttpError} When the device answers with a status outside 2xx.
 * @throws {IsapiError} When the device answers a failing `<ResponseStatus>`,
 *   as a camera does for this path.
 *
 * @example Read through a stubbed fetch
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { resolvesNext, spy } from "@std/testing/mock";
 * import { readInputProxyChannelStatus } from "@hertzg/hikvision-api/config/channel-status";
 *
 * const fetch = spy(resolvesNext([
 *   new Response(
 *     "<InputProxyChannelStatusList><InputProxyChannelStatus><id>1</id>" +
 *       "<online>true</online><chanDetectResult>connect</chanDetectResult>" +
 *       "</InputProxyChannelStatus></InputProxyChannelStatusList>",
 *   ),
 * ]));
 *
 * const status = await readInputProxyChannelStatus({
 *   baseUrl: "http://192.0.2.10",
 *   username: "admin",
 *   password: "hunter2",
 *   fetch,
 * });
 *
 * assertEquals(status.map((channel) => channel.online), [true]);
 * assertEquals(
 *   fetch.calls[0].args[0],
 *   "http://192.0.2.10/ISAPI/ContentMgmt/InputProxy/channels/status",
 * );
 * ```
 */
export async function readInputProxyChannelStatus(
  options: RequestOptions,
): Promise<InputProxyChannelStatus[]> {
  return inputProxyChannelStatus(
    await requestXml(options, INPUT_PROXY_CHANNEL_STATUS_PATH),
  );
}

function inputProxyChannelStatus(root: XmlElement): InputProxyChannelStatus[] {
  return elements(root, "InputProxyChannelStatus").map((entry) => {
    const source = element(entry, "sourceInputPortDescriptor");
    const security = element(entry, "SecurityStatus");
    const streaming = element(entry, "streamingProxyChannelIdList");
    return {
      id: Number(requireText(entry, "id")),
      online: requireText(entry, "online") === "true",
      ...present({
        chanDetectResult: text(entry, "chanDetectResult"),
        url: text(entry, "url"),
        ipAddress: source && text(source, "ipAddress"),
        proxyProtocol: source && text(source, "proxyProtocol"),
        managePortNo: source && parseNumber(text(source, "managePortNo")),
        srcInputPort: source && parseNumber(text(source, "srcInputPort")),
        connMode: source && text(source, "connMode"),
        passwordStatus: security && text(security, "PasswordStatus"),
        streamingProxyChannelIds: streaming &&
          elements(streaming, "streamingProxyChannelId").map((id) =>
            Number(textContent(id))
          ),
      }),
    };
  });
}
