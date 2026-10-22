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
 * import { parseInputProxyChannels } from "./channels.ts";
 *
 * const channels = parseInputProxyChannels(
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
} from "../isapi/document.ts";
import { readDocument, type RequestOptions } from "../isapi/request.ts";

/** The input proxy channel list path. */
export const INPUT_PROXY_CHANNELS_PATH =
  "/ISAPI/ContentMgmt/InputProxy/channels";

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

const channelList = document({ InputProxyChannel: repeated(channel) });

/**
 * Parses an `<InputProxyChannelList>` document.
 *
 * @param xml The document text.
 * @returns The channels in document order.
 * @throws {IsapiError} When the request fails: a status outside 2xx, or a failing `<ResponseStatus>` on any status.
 *
 * @example A channel without a source descriptor
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseInputProxyChannels } from "./channels.ts";
 *
 * const channels = parseInputProxyChannels(
 *   "<InputProxyChannelList><InputProxyChannel><id>2</id><name>Camera 02</name>" +
 *     "</InputProxyChannel></InputProxyChannelList>",
 * );
 *
 * assertEquals(channels, [{ id: 2, name: "Camera 02" }]);
 * ```
 */
export function parseInputProxyChannels(xml: string): InputProxyChannel[] {
  return channelList.parse(xml).InputProxyChannel.map(flattenSource);
}

/**
 * Reads the channel list from an NVR.
 *
 * @param options Where the NVR is and how to log in.
 * @returns The channels in document order.
 * @throws {IsapiError} When the request fails: a status outside 2xx, or a failing `<ResponseStatus>` on any status.
 *
 * @example Read through a stubbed fetch
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { resolvesNext, spy } from "@std/testing/mock";
 * import { readInputProxyChannels } from "./channels.ts";
 *
 * const fetch = spy(resolvesNext([
 *   new Response(
 *     "<InputProxyChannelList><InputProxyChannel><id>1</id><name>Camera 01</name>" +
 *       "</InputProxyChannel></InputProxyChannelList>",
 *   ),
 * ]));
 *
 * const channels = await readInputProxyChannels({
 *   baseUrl: "http://192.0.2.10",
 *   username: "admin",
 *   password: "hunter2",
 *   fetch,
 * });
 *
 * assertEquals(channels.map((channel) => channel.name), ["Camera 01"]);
 * assertEquals(fetch.calls[0].args[0], "http://192.0.2.10/ISAPI/ContentMgmt/InputProxy/channels");
 * ```
 */
export async function readInputProxyChannels(
  options: RequestOptions,
): Promise<InputProxyChannel[]> {
  const list = await readDocument(
    options,
    INPUT_PROXY_CHANNELS_PATH,
    channelList,
  );
  return list.InputProxyChannel.map(flattenSource);
}

function flattenSource(
  { sourceInputPortDescriptor: source, ...fields }: FieldValue<typeof channel>,
): InputProxyChannel {
  return { ...fields, ...source };
}
