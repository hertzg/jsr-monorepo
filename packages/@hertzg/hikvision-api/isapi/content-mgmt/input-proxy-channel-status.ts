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
 * import { inputProxyChannelStatus } from "./input-proxy-channel-status.ts";
 *
 * const status = inputProxyChannelStatus.codec.parse(
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

import {
  bool,
  document,
  type FieldValue,
  int,
  list,
  obj,
  optional,
  repeated,
  text,
} from "../document.ts";
import type { Resource } from "../request.ts";

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

const channelStatus = obj({
  id: int(),
  online: bool(),
  chanDetectResult: optional(text()),
  url: optional(text()),
  sourceInputPortDescriptor: optional(obj({
    ipAddress: optional(text()),
    proxyProtocol: optional(text()),
    managePortNo: optional(int()),
    srcInputPort: optional(int()),
    connMode: optional(text()),
  })),
  SecurityStatus: optional(obj({ PasswordStatus: text() })),
  streamingProxyChannelIdList: optional(list("streamingProxyChannelId", int())),
});

/**
 * The channel status list resource,
 * `/ISAPI/ContentMgmt/InputProxy/channels/status`.
 *
 * NVR only: a camera answers with a failing `<ResponseStatus>`, which reads
 * as an `IsapiError`. The statuses come in document order.
 *
 * @example Read through a stubbed fetch
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { resolvesNext, spy } from "@std/testing/mock";
 * import { read } from "../request.ts";
 * import { inputProxyChannelStatus } from "./input-proxy-channel-status.ts";
 *
 * const fetch = spy(resolvesNext([
 *   new Response(
 *     "<InputProxyChannelStatusList><InputProxyChannelStatus><id>3</id>" +
 *       "<online>false</online><chanDetectResult>netUnreachable</chanDetectResult>" +
 *       "</InputProxyChannelStatus></InputProxyChannelStatusList>",
 *   ),
 * ]));
 *
 * const status = await read({
 *   baseUrl: "http://192.0.2.10",
 *   username: "admin",
 *   password: "hunter2",
 *   fetch,
 * }, inputProxyChannelStatus);
 *
 * assertEquals(status, [{ id: 3, online: false, chanDetectResult: "netUnreachable" }]);
 * assertEquals(
 *   fetch.calls[0].args[0],
 *   "http://192.0.2.10/ISAPI/ContentMgmt/InputProxy/channels/status",
 * );
 * ```
 */
export const inputProxyChannelStatus: Resource<InputProxyChannelStatus[]> = {
  path: "/ISAPI/ContentMgmt/InputProxy/channels/status",
  codec: document({ InputProxyChannelStatus: repeated(channelStatus) }).map(
    (list) => list.InputProxyChannelStatus.map(toInputProxyChannelStatus),
  ),
};

function toInputProxyChannelStatus(
  {
    sourceInputPortDescriptor: source,
    SecurityStatus: security,
    streamingProxyChannelIdList: streamingProxyChannelIds,
    ...status
  }: FieldValue<typeof channelStatus>,
): InputProxyChannelStatus {
  return {
    ...status,
    ...source,
    ...(security && { passwordStatus: security.PasswordStatus }),
    ...(streamingProxyChannelIds && { streamingProxyChannelIds }),
  };
}
