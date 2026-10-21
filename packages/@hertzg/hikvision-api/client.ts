/**
 * One device, one set of credentials, every request.
 *
 * {@link createClient} binds the base URL, user name, password and `fetch`
 * once, and exposes the readers of the config modules plus the alert
 * stream. It holds no connection and no state: ISAPI is plain HTTP, each
 * call is its own request, and nothing has to be closed.
 *
 * @example Name the channel each motion alert is about
 * ```ts ignore
 * import { createClient } from "@hertzg/hikvision-api/client";
 *
 * const nvr = createClient({
 *   baseUrl: "http://192.0.2.10",
 *   username: "admin",
 *   password: "hunter2",
 * });
 *
 * const names = new Map(
 *   (await nvr.channels()).map((channel) => [channel.id, channel.name]),
 * );
 *
 * for await (const alert of await nvr.subscribe()) {
 *   if (alert.eventType === "VMD") {
 *     console.log(alert.at, names.get(alert.channel), "motion");
 *   }
 * }
 * ```
 *
 * @module
 */

import type { XmlElement } from "@std/xml";
import {
  type InputProxyChannel,
  readInputProxyChannels,
} from "./config/channels.ts";
import { type DeviceInfo, readDeviceInfo } from "./config/device-info.ts";
import {
  type MotionDetection,
  type MotionDetectionTarget,
  readMotionDetection,
} from "./config/motion-detection.ts";
import {
  type FieldDetection,
  type LineDetection,
  readFieldDetection,
  readLineDetection,
} from "./config/smart.ts";
import type { Alert } from "./events/alert.ts";
import { openAlertStream } from "./events/stream.ts";
import { request, type RequestOptions, requestXml } from "./request.ts";

/** Where the device is and how to log in; see {@link RequestOptions}. */
export type ClientOptions = RequestOptions;

/** Options for {@link Client.subscribe}. */
export type SubscribeOptions = {
  /** Aborting it ends the stream. */
  signal?: AbortSignal;
};

/** Which smart rule set to read. */
export type SmartRuleOptions = {
  /** The rule set number. Defaults to `1`. */
  id?: number;
};

/** A client bound to one device. */
export type Client = {
  /**
   * Sends any request with the client's credentials.
   *
   * @throws {HttpError} When the status is not 2xx.
   */
  request: (path: string, init?: RequestInit) => Promise<Response>;
  /**
   * Sends any request and parses the reply as an ISAPI document, for paths
   * this package has no reader for.
   *
   * @throws {HttpError} When the status is not 2xx.
   * @throws {IsapiError} When the body is a failing `<ResponseStatus>`.
   */
  xml: (path: string, init?: RequestInit) => Promise<XmlElement>;
  /** Reads `/ISAPI/System/deviceInfo`. */
  deviceInfo: () => Promise<DeviceInfo>;
  /** Reads `/ISAPI/ContentMgmt/InputProxy/channels`: an NVR's IP cameras. */
  channels: () => Promise<InputProxyChannel[]>;
  /** Reads a channel's motion detection grid. */
  motionDetection: (target: MotionDetectionTarget) => Promise<MotionDetection>;
  /** Reads `/ISAPI/Smart/FieldDetection/<id>`: intrusion regions. */
  fieldDetection: (options?: SmartRuleOptions) => Promise<FieldDetection>;
  /** Reads `/ISAPI/Smart/LineDetection/<id>`: crossing lines. */
  lineDetection: (options?: SmartRuleOptions) => Promise<LineDetection>;
  /**
   * Opens the alert stream. The stream ends when the device closes the
   * connection or `signal` aborts; it never reconnects.
   *
   * @throws {HttpError} When the device answers with a status outside 2xx.
   * @throws {IsapiError} When the device answers a failing `<ResponseStatus>`.
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
 * import { createClient } from "@hertzg/hikvision-api/client";
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
    channels: () => readInputProxyChannels(options),
    motionDetection: (target) => readMotionDetection(options, target),
    fieldDetection: ({ id } = {}) => readFieldDetection(options, id),
    lineDetection: ({ id } = {}) => readLineDetection(options, id),
    subscribe: ({ signal } = {}) => openAlertStream({ ...options, signal }),
  };
}
