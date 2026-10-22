/**
 * `/ISAPI/ContentMgmt/InputProxy/channels`: the IP cameras behind an NVR.
 *
 * An NVR's IP cameras are "input proxy channels", numbered from 1. The
 * number is what the alert stream reports as `<dynChannelID>` and what the
 * NVR's per-channel config paths take.
 *
 * ```xml
 * <InputProxyChannelList version="2.0" xmlns="http://www.hikvision.com/ver20/XMLSchema">
 * <InputProxyChannel version="2.0" xmlns="http://www.hikvision.com/ver20/XMLSchema">
 * <id>1</id>
 * <name>Camera 01</name>
 * <sourceInputPortDescriptor>
 * <proxyProtocol>HIKVISION</proxyProtocol>
 * <addressingFormatType>ipaddress</addressingFormatType>
 * <ipAddress>192.0.2.21</ipAddress>
 * <managePortNo>8000</managePortNo>
 * <srcInputPort>1</srcInputPort>
 * </sourceInputPortDescriptor>
 * </InputProxyChannel>
 * </InputProxyChannelList>
 * ```
 *
 * @example Parse a channel list
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { inputProxyChannels } from "./input-proxy-channels.ts";
 *
 * const channels = inputProxyChannels.codec.parse(
 *   "<InputProxyChannelList><InputProxyChannel><id>1</id><name>Camera 01</name>" +
 *     "<sourceInputPortDescriptor><proxyProtocol>HIKVISION</proxyProtocol>" +
 *     "<ipAddress>192.0.2.21</ipAddress><managePortNo>8000</managePortNo>" +
 *     "</sourceInputPortDescriptor></InputProxyChannel></InputProxyChannelList>",
 * );
 *
 * assertEquals(channels, [{
 *   id: 1,
 *   name: "Camera 01",
 *   proxyProtocol: "HIKVISION",
 *   ipAddress: "192.0.2.21",
 *   managePortNo: 8000,
 * }]);
 * ```
 *
 * @module
 */

import {
  document,
  type FieldValue,
  int,
  obj,
  optional,
  repeated,
  text,
} from "../document.ts";
import type { Resource } from "../request.ts";

/** One `<InputProxyChannel>`: an IP camera as the NVR sees it. */
export type InputProxyChannel = {
  /** `<id>`, the channel number from 1. */
  id: number;
  /** `<name>`, as set on the NVR. */
  name: string;
  /** `<proxyProtocol>`, such as `HIKVISION` or `ONVIF`. */
  proxyProtocol?: string;
  /** `<ipAddress>` of the camera. */
  ipAddress?: string;
  /** `<managePortNo>` of the camera, usually `8000`. */
  managePortNo?: number;
  /** `<srcInputPort>`: which of the camera's inputs this channel shows. */
  srcInputPort?: number;
};

const channel = obj({
  id: int(),
  name: text(),
  sourceInputPortDescriptor: optional(obj({
    proxyProtocol: optional(text()),
    ipAddress: optional(text()),
    managePortNo: optional(int()),
    srcInputPort: optional(int()),
  })),
});

/**
 * The channel list resource, `/ISAPI/ContentMgmt/InputProxy/channels`.
 *
 * The channels come in document order; a channel without a source descriptor
 * has only `id` and `name`.
 *
 * @example Read through a stubbed fetch
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { resolvesNext, spy } from "@std/testing/mock";
 * import { read } from "../request.ts";
 * import { inputProxyChannels } from "./input-proxy-channels.ts";
 *
 * const fetch = spy(resolvesNext([
 *   new Response(
 *     "<InputProxyChannelList><InputProxyChannel><id>2</id><name>Camera 02</name>" +
 *       "</InputProxyChannel></InputProxyChannelList>",
 *   ),
 * ]));
 *
 * const channels = await read({
 *   baseUrl: "http://192.0.2.10",
 *   username: "admin",
 *   password: "hunter2",
 *   fetch,
 * }, inputProxyChannels);
 *
 * assertEquals(channels, [{ id: 2, name: "Camera 02" }]);
 * assertEquals(fetch.calls[0].args[0], "http://192.0.2.10/ISAPI/ContentMgmt/InputProxy/channels");
 * ```
 */
export const inputProxyChannels: Resource<InputProxyChannel[]> = {
  path: "/ISAPI/ContentMgmt/InputProxy/channels",
  codec: document({ InputProxyChannel: repeated(channel) }).map((list) =>
    list.InputProxyChannel.map(toInputProxyChannel)
  ),
};

function toInputProxyChannel(
  { sourceInputPortDescriptor: source, ...fields }: FieldValue<typeof channel>,
): InputProxyChannel {
  return { ...fields, ...source };
}
