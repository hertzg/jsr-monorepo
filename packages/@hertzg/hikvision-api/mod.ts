/**
 * Hikvision ISAPI client: the alert stream and the config documents a
 * monitoring tool needs, for an NVR or a camera.
 *
 * ISAPI is Hikvision's HTTP API. {@link createClient} binds a device's base
 * URL and credentials once; every method is one request, and the alert
 * stream is a `ReadableStream` that ends when its signal aborts. Basic auth,
 * an injectable `fetch`, and nothing runtime-specific: Deno, Bun, or
 * anywhere `fetch` and web streams exist. An NVR also fronts each camera's
 * own ISAPI on a virtual host port: `baseUrl: "http://<nvr>:65002"` reaches
 * camera 2 through the NVR.
 *
 * ```
 * createClient({ baseUrl, username, password })
 *   .subscribe({ signal })            ─> GET alertStream, multipart parts ─> Alert, Alert, …
 *   .deviceInfo()                     ─> /ISAPI/System/deviceInfo
 *   .time()                           ─> /ISAPI/System/time
 *   .channels()                       ─> /ISAPI/ContentMgmt/InputProxy/channels
 *   .channelStatus()                  ─> /ISAPI/ContentMgmt/InputProxy/channels/status
 *   .motionDetection({ channel })     ─> …/motionDetection, grid and regions decoded
 *   .motionDetectionCapabilities(…)   ─> …/motionDetection/capabilities
 *   .smartRules({ type, channel })    ─> /ISAPI/Smart/<type>/<channel>
 *   .fieldDetection({ channel })      ─> /ISAPI/Smart/FieldDetection/<channel>
 *   .lineDetection({ channel })       ─> /ISAPI/Smart/LineDetection/<channel>
 *   .xml(path) / .request(path, init) ─> anything else
 * ```
 *
 * The client does not reconnect, keep timers, or decide when motion ended.
 * A device posts `VMD active` about once a second while motion lasts; VMD
 * never posts `inactive`, though some smart events do. Every alert carries
 * its arrival time in `at` so the consumer can apply its own silence
 * threshold.
 *
 * @example Print motion alerts with the channel's name
 * ```ts ignore
 * import { createClient } from "@hertzg/hikvision-api";
 *
 * const nvr = createClient({
 *   baseUrl: "http://192.0.2.10",
 *   username: "admin",
 *   password: "hunter2",
 * });
 * const names = new Map(
 *   (await nvr.channels()).map((channel) => [channel.id, channel.name]),
 * );
 *
 * for await (const alert of await nvr.subscribe({ signal: AbortSignal.timeout(60_000) })) {
 *   if (alert.eventType === "VMD" && alert.eventState === "active") {
 *     console.log(alert.at, names.get(alert.channel), "motion");
 *   }
 * }
 * ```
 *
 * @example Read a camera's motion grid
 * ```ts ignore
 * import { createClient } from "@hertzg/hikvision-api";
 *
 * const camera = createClient({
 *   baseUrl: "http://192.0.2.21",
 *   username: "admin",
 *   password: "hunter2",
 * });
 * const motion = await camera.motionDetection({ channel: 1 });
 *
 * console.log(motion.grid?.map((row) => row.map((cell) => cell ? "#" : ".").join("")).join("\n"));
 * ```
 *
 * @module
 */

import type { XmlElement } from "@std/xml";
import {
  type InputProxyChannelStatus,
  readInputProxyChannelStatus,
} from "./config/channel-status.ts";
import {
  type InputProxyChannel,
  readInputProxyChannels,
} from "./config/channels.ts";
import { type DeviceInfo, readDeviceInfo } from "./config/device-info.ts";
import {
  type LineDetection,
  readLineDetection,
} from "./config/line-detection.ts";
import {
  type MotionDetectionCapabilities,
  readMotionDetectionCapabilities,
} from "./config/motion-capabilities.ts";
import {
  type MotionDetection,
  type MotionDetectionTarget,
  readMotionDetection,
} from "./config/motion-detection.ts";
import {
  type FieldDetection,
  readFieldDetection,
  readSmartRules,
  type SmartRules,
  type SmartRuleType,
} from "./config/smart.ts";
import { type DeviceTime, readDeviceTime } from "./config/time.ts";
import type { Alert } from "./events/alert.ts";
import { openAlertStream } from "./events/stream.ts";
import { request, type RequestOptions, requestXml } from "./isapi/request.ts";

export type { RequestOptions } from "./isapi/request.ts";
export { IsapiError } from "./isapi/status.ts";
export type { ResponseStatus } from "./isapi/status.ts";
export type { Point } from "./isapi/document.ts";
export { parseAlert } from "./events/alert.ts";
export type { Alert, AlertRegion, TargetRect } from "./events/alert.ts";
export { openAlertStream } from "./events/stream.ts";
export type { AlertStreamOptions } from "./events/stream.ts";
export { parseDeviceInfo } from "./config/device-info.ts";
export type { DeviceInfo } from "./config/device-info.ts";
export { parseDeviceTime, parseTimeZoneOffset } from "./config/time.ts";
export type { DeviceTime } from "./config/time.ts";
export { parseInputProxyChannels } from "./config/channels.ts";
export type { InputProxyChannel } from "./config/channels.ts";
export { parseInputProxyChannelStatus } from "./config/channel-status.ts";
export type { InputProxyChannelStatus } from "./config/channel-status.ts";
export { decodeGridMap, encodeGridMap } from "./config/grid-map.ts";
export { parseMotionDetection } from "./config/motion-detection.ts";
export type {
  MotionDetection,
  MotionDetectionTarget,
  MotionRegion,
} from "./config/motion-detection.ts";
export { parseMotionDetectionCapabilities } from "./config/motion-capabilities.ts";
export type { MotionDetectionCapabilities } from "./config/motion-capabilities.ts";
export {
  parseFieldDetection,
  parseSmartRules,
  SMART_RULE_TYPES,
} from "./config/smart.ts";
export type {
  FieldDetection,
  FieldDetectionRegion,
  NormalizedScreenSize,
  SmartRegion,
  SmartRule,
  SmartRules,
  SmartRuleType,
} from "./config/smart.ts";
export { parseLineDetection } from "./config/line-detection.ts";
export type {
  LineDetection,
  LineDetectionLine,
} from "./config/line-detection.ts";

/** Where the device is and how to log in; see {@link RequestOptions}. */
export type ClientOptions = RequestOptions;

/** Options for {@link Client.subscribe}. */
export type SubscribeOptions = {
  /** Aborting it ends the stream. */
  signal?: AbortSignal;
};

/** Which channel's smart rules to read. */
export type SmartRuleOptions = {
  /** The video channel, from 1. Defaults to `1`. */
  channel?: number;
};

/** Which smart rule set and channel {@link Client.smartRules} reads. */
export type SmartRulesOptions = SmartRuleOptions & {
  /** The rule type, such as `FieldDetection` or `regionEntrance`. */
  type: SmartRuleType;
};

/** A client bound to one device. */
export type Client = {
  /**
   * Sends any request with the client's credentials.
   *
   * @throws {IsapiError} When the request fails: a status outside 2xx, or a failing `<ResponseStatus>` on any status.
   */
  request: (path: string, init?: RequestInit) => Promise<Response>;
  /**
   * Sends any request and parses the reply as an ISAPI document, for paths
   * this package has no reader for.
   *
   * @throws {IsapiError} When the request fails: a status outside 2xx, or a failing `<ResponseStatus>` on any status.
   */
  xml: (path: string, init?: RequestInit) => Promise<XmlElement>;
  /** Reads `/ISAPI/System/deviceInfo`. */
  deviceInfo: () => Promise<DeviceInfo>;
  /** Reads `/ISAPI/System/time`: the device clock and its zone. */
  time: () => Promise<DeviceTime>;
  /** Reads `/ISAPI/ContentMgmt/InputProxy/channels`: an NVR's IP cameras. */
  channels: () => Promise<InputProxyChannel[]>;
  /** Reads `/ISAPI/ContentMgmt/InputProxy/channels/status`: which IP cameras are online. */
  channelStatus: () => Promise<InputProxyChannelStatus[]>;
  /** Reads a channel's motion detection settings, grid and regions. */
  motionDetection: (target: MotionDetectionTarget) => Promise<MotionDetection>;
  /** Reads what a channel's motion detection supports. */
  motionDetectionCapabilities: (
    target: MotionDetectionTarget,
  ) => Promise<MotionDetectionCapabilities>;
  /** Reads `/ISAPI/Smart/<type>/<channel>`: any region-type smart rule set. */
  smartRules: (options: SmartRulesOptions) => Promise<SmartRules>;
  /** Reads `/ISAPI/Smart/FieldDetection/<channel>`: intrusion regions. */
  fieldDetection: (options?: SmartRuleOptions) => Promise<FieldDetection>;
  /** Reads `/ISAPI/Smart/LineDetection/<channel>`: crossing lines. */
  lineDetection: (options?: SmartRuleOptions) => Promise<LineDetection>;
  /**
   * Opens the alert stream. The stream ends when the device closes the
   * connection or `signal` aborts; it never reconnects.
   *
   * @throws {IsapiError} When the request fails: a status outside 2xx, or a failing `<ResponseStatus>` on any status.
   */
  subscribe: (options?: SubscribeOptions) => Promise<ReadableStream<Alert>>;
};

/**
 * Creates a client for one device.
 *
 * @param options Where the device is, how to log in, and optionally which `fetch` to use.
 * @returns The client.
 *
 * @example Every call carries the credentials to the right path
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { resolvesNext, spy } from "@std/testing/mock";
 * import { createClient } from "@hertzg/hikvision-api";
 *
 * const fetch = spy(resolvesNext([
 *   new Response(
 *     "<DeviceInfo><model>DS-7608NI-Q2/8P</model>" +
 *       "<firmwareVersion>V4.75.207</firmwareVersion><deviceType>NVR</deviceType></DeviceInfo>",
 *   ),
 * ]));
 * const nvr = createClient({
 *   baseUrl: "http://192.0.2.10",
 *   username: "admin",
 *   password: "hunter2",
 *   fetch,
 * });
 *
 * const info = await nvr.deviceInfo();
 *
 * assertEquals(info.deviceType, "NVR");
 * assertEquals(fetch.calls[0].args[0], "http://192.0.2.10/ISAPI/System/deviceInfo");
 * const init = fetch.calls[0].args[1] as RequestInit;
 * assertEquals(new Headers(init.headers).get("authorization"), "Basic YWRtaW46aHVudGVyMg==");
 * ```
 */
export function createClient(options: ClientOptions): Client {
  return {
    request: (path, init) => request(options, path, init),
    xml: (path, init) => requestXml(options, path, init),
    deviceInfo: () => readDeviceInfo(options),
    time: () => readDeviceTime(options),
    channels: () => readInputProxyChannels(options),
    channelStatus: () => readInputProxyChannelStatus(options),
    motionDetection: (target) => readMotionDetection(options, target),
    motionDetectionCapabilities: (target) =>
      readMotionDetectionCapabilities(options, target),
    smartRules: (rule) => readSmartRules(options, rule),
    fieldDetection: ({ channel } = {}) => readFieldDetection(options, channel),
    lineDetection: ({ channel } = {}) => readLineDetection(options, channel),
    subscribe: ({ signal } = {}) => openAlertStream({ ...options, signal }),
  };
}
