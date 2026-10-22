/**
 * Hikvision ISAPI client: the alert stream and the resources a monitoring
 * tool reads, for an NVR or a camera.
 *
 * ISAPI is Hikvision's HTTP API: XML documents at paths under `/ISAPI/`.
 * This package describes each document once as a codec and reads it
 * through one engine. {@link createClient} binds a device's base URL and
 * credentials; every method is one request, and the alert stream is a
 * `ReadableStream` that ends when its signal aborts. Basic auth, an
 * injectable `fetch`, nothing runtime-specific: Deno, Bun, or anywhere
 * `fetch` and web streams exist. An NVR also fronts each camera's own
 * ISAPI on a virtual host port: `baseUrl: "http://<nvr>:65002"` reaches
 * camera 2 through the NVR.
 *
 * ```
 * createClient({ baseUrl, username, password })
 *   .subscribe({ signal })              ─> GET /ISAPI/Event/notification/alertStream ─> Alert, Alert, …
 *   .read(deviceInfo)                   ─> any resource: /ISAPI/System/deviceInfo
 *   .read(motionDetection({ channel })) ─> …/motionDetection, grid and regions decoded
 *   .deviceInfo(), .time(), .channels(), .channelStatus(), .motionDetection(…),
 *   .motionDetectionCapabilities(…), .smartRules(…), .fieldDetection(…), .lineDetection(…)
 *                                       ─> the same resources, by name
 *   .xml(path) / .request(path, init)   ─> anything else
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
 * import { createClient, motionDetection } from "@hertzg/hikvision-api";
 *
 * const camera = createClient({
 *   baseUrl: "http://192.0.2.21",
 *   username: "admin",
 *   password: "hunter2",
 * });
 * const motion = await camera.read(motionDetection({ channel: 1 }));
 *
 * console.log(motion.grid?.map((row) => row.map((cell) => cell ? "#" : ".").join("")).join("\n"));
 * ```
 *
 * @module
 */

import type { XmlElement } from "@std/xml";
import {
  type InputProxyChannelStatus,
  inputProxyChannelStatus,
} from "./isapi/content-mgmt/input-proxy-channel-status.ts";
import {
  type InputProxyChannel,
  inputProxyChannels,
} from "./isapi/content-mgmt/input-proxy-channels.ts";
import {
  type MotionDetectionCapabilities,
  motionDetectionCapabilities,
} from "./isapi/content-mgmt/motion-detection-capabilities.ts";
import {
  type MotionDetection,
  motionDetection,
  type MotionDetectionTarget,
} from "./isapi/content-mgmt/motion-detection.ts";
import type { Alert } from "./isapi/event/alert.ts";
import { openAlertStream } from "./isapi/event/alert-stream.ts";
import {
  read,
  request,
  type RequestOptions,
  requestXml,
  type Resource,
} from "./isapi/request.ts";
import {
  type LineDetection,
  lineDetection,
} from "./isapi/smart/line-detection.ts";
import {
  type FieldDetection,
  fieldDetection,
  type SmartRules,
  smartRules,
  type SmartRuleType,
} from "./isapi/smart/rules.ts";
import { type DeviceInfo, deviceInfo } from "./isapi/system/device-info.ts";
import { type DeviceTime, deviceTime } from "./isapi/system/time.ts";

export type { Point } from "./isapi/document.ts";
export type { RequestOptions, Resource } from "./isapi/request.ts";
export { IsapiError } from "./isapi/status.ts";
export type { IsapiFailure, ResponseStatus } from "./isapi/status.ts";
export { parseAlert } from "./isapi/event/alert.ts";
export type { Alert, AlertRegion, TargetRect } from "./isapi/event/alert.ts";
export { openAlertStream } from "./isapi/event/alert-stream.ts";
export type { AlertStreamOptions } from "./isapi/event/alert-stream.ts";
export { deviceInfo } from "./isapi/system/device-info.ts";
export type { DeviceInfo } from "./isapi/system/device-info.ts";
export { deviceTime, parseTimeZoneOffset } from "./isapi/system/time.ts";
export type { DeviceTime } from "./isapi/system/time.ts";
export { inputProxyChannels } from "./isapi/content-mgmt/input-proxy-channels.ts";
export type { InputProxyChannel } from "./isapi/content-mgmt/input-proxy-channels.ts";
export { inputProxyChannelStatus } from "./isapi/content-mgmt/input-proxy-channel-status.ts";
export type { InputProxyChannelStatus } from "./isapi/content-mgmt/input-proxy-channel-status.ts";
export { decodeGridMap, encodeGridMap } from "./isapi/content-mgmt/grid-map.ts";
export { motionDetection } from "./isapi/content-mgmt/motion-detection.ts";
export type {
  MotionDetection,
  MotionDetectionTarget,
  MotionRegion,
} from "./isapi/content-mgmt/motion-detection.ts";
export { motionDetectionCapabilities } from "./isapi/content-mgmt/motion-detection-capabilities.ts";
export type { MotionDetectionCapabilities } from "./isapi/content-mgmt/motion-detection-capabilities.ts";
export {
  fieldDetection,
  SMART_RULE_TYPES,
  smartRules,
} from "./isapi/smart/rules.ts";
export type {
  FieldDetection,
  FieldDetectionRegion,
  NormalizedScreenSize,
  SmartRegion,
  SmartRule,
  SmartRules,
  SmartRuleType,
} from "./isapi/smart/rules.ts";
export { lineDetection } from "./isapi/smart/line-detection.ts";
export type {
  LineDetection,
  LineDetectionLine,
} from "./isapi/smart/line-detection.ts";

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
   * Reads any resource, such as {@link deviceInfo} or
   * `motionDetection({ channel: 2 })`.
   *
   * @throws {IsapiError} When the request fails: a status outside 2xx, or a failing `<ResponseStatus>` on any status.
   */
  read: <T>(resource: Resource<T>) => Promise<T>;
  /**
   * Sends any request with the client's credentials.
   *
   * @throws {IsapiError} When the request fails: a status outside 2xx, or a failing `<ResponseStatus>` on any status.
   */
  request: (path: string, init?: RequestInit) => Promise<Response>;
  /**
   * Sends any request and parses the reply as an ISAPI document, for paths
   * this package has no resource for.
   *
   * @throws {IsapiError} When the request fails: a status outside 2xx, or a failing `<ResponseStatus>` on any status.
   */
  xml: (path: string, init?: RequestInit) => Promise<XmlElement>;
  /** Reads {@link deviceInfo}. */
  deviceInfo: () => Promise<DeviceInfo>;
  /** Reads {@link deviceTime}: the device clock and its zone. */
  time: () => Promise<DeviceTime>;
  /** Reads {@link inputProxyChannels}: an NVR's IP cameras. */
  channels: () => Promise<InputProxyChannel[]>;
  /** Reads {@link inputProxyChannelStatus}: which IP cameras are online. */
  channelStatus: () => Promise<InputProxyChannelStatus[]>;
  /** Reads {@link motionDetection} for a channel: settings, grid and regions. */
  motionDetection: (target: MotionDetectionTarget) => Promise<MotionDetection>;
  /** Reads {@link motionDetectionCapabilities} for a channel. */
  motionDetectionCapabilities: (
    target: MotionDetectionTarget,
  ) => Promise<MotionDetectionCapabilities>;
  /** Reads {@link smartRules}: any region-type smart rule set of a channel. */
  smartRules: (options: SmartRulesOptions) => Promise<SmartRules>;
  /** Reads {@link fieldDetection}: a channel's intrusion regions. */
  fieldDetection: (options?: SmartRuleOptions) => Promise<FieldDetection>;
  /** Reads {@link lineDetection}: a channel's crossing lines. */
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
 * import { createClient, deviceInfo } from "@hertzg/hikvision-api";
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
 * const info = await nvr.read(deviceInfo);
 *
 * assertEquals(info.deviceType, "NVR");
 * assertEquals(fetch.calls[0].args[0], "http://192.0.2.10/ISAPI/System/deviceInfo");
 * const init = fetch.calls[0].args[1] as RequestInit;
 * assertEquals(new Headers(init.headers).get("authorization"), "Basic YWRtaW46aHVudGVyMg==");
 * ```
 */
export function createClient(options: ClientOptions): Client {
  return {
    read: (resource) => read(options, resource),
    request: (path, init) => request(options, path, init),
    xml: (path, init) => requestXml(options, path, init),
    deviceInfo: () => read(options, deviceInfo),
    time: () => read(options, deviceTime),
    channels: () => read(options, inputProxyChannels),
    channelStatus: () => read(options, inputProxyChannelStatus),
    motionDetection: (target) => read(options, motionDetection(target)),
    motionDetectionCapabilities: (target) =>
      read(options, motionDetectionCapabilities(target)),
    smartRules: (rule) => read(options, smartRules(rule)),
    fieldDetection: (rule = {}) => read(options, fieldDetection(rule)),
    lineDetection: (rule = {}) => read(options, lineDetection(rule)),
    subscribe: ({ signal } = {}) => openAlertStream({ ...options, signal }),
  };
}
