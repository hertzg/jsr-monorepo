/**
 * Hikvision ISAPI: the alert stream and the documents a monitoring tool
 * reads, from an NVR or a camera.
 *
 * ISAPI is Hikvision's HTTP API: XML documents at paths under `/ISAPI/`.
 * This package is three layers of plain functions over a {@link Device},
 * which is where the device is and how to log in. There is no client
 * object; the device is the first argument of every call.
 *
 * ```
 * const nvr: Device = { baseUrl, username, password };
 *
 * request(nvr, "/ISAPI/System/time")          ─> Response                 raw HTTP with auth
 * request(nvr, deviceInfo)                     ─> DeviceInfo               any resource, decoded
 * request(nvr, motionDetection({ channel: 2 })) ─> MotionDetection
 * stream(nvr, alertStream, { signal })         ─> ReadableStream<Alert>    until the signal aborts
 * ```
 *
 * A {@link Resource} is a path and a codec; the ones this package knows
 * are exported by name, and one that takes parameters is a function. The
 * device is never asked what it is: a resource it does not serve fails
 * with an {@link IsapiError}, usually `notSupport`. Basic auth, an
 * injectable `fetch`, nothing runtime-specific: Deno, Bun, or anywhere
 * `fetch` and web streams exist. An NVR also fronts each camera's own
 * ISAPI on a virtual host port: `baseUrl: "http://<nvr>:65002"` reaches
 * camera 2 through the NVR.
 *
 * The stream does not reconnect, keep timers, or decide when motion
 * ended. A device posts `VMD active` about once a second while motion
 * lasts; VMD never posts `inactive`, though some smart events do. Every
 * alert carries its arrival time in `at` so the consumer can apply its
 * own silence threshold.
 *
 * @example Print motion alerts with the channel's name
 * ```ts ignore
 * import { alertStream, inputProxyChannels, request, stream } from "@hertzg/hikvision-api";
 *
 * const nvr = { baseUrl: "http://192.0.2.10", username: "admin", password: "hunter2" };
 * const names = new Map(
 *   (await request(nvr, inputProxyChannels)).map((channel) => [channel.id, channel.name]),
 * );
 *
 * for await (const alert of await stream(nvr, alertStream, { signal: AbortSignal.timeout(60_000) })) {
 *   if (alert.eventType === "VMD" && alert.eventState === "active") {
 *     console.log(alert.at, names.get(alert.channel), "motion");
 *   }
 * }
 * ```
 *
 * @example Read a camera's motion grid
 * ```ts ignore
 * import { motionDetection, request } from "@hertzg/hikvision-api";
 *
 * const camera = { baseUrl: "http://192.0.2.21", username: "admin", password: "hunter2" };
 * const motion = await request(camera, motionDetection({ channel: 1 }));
 *
 * console.log(motion.grid?.map((row) => row.map((cell) => cell ? "#" : ".").join("")).join("\n"));
 * ```
 *
 * @example Every call carries the credentials to the resource's path
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { resolvesNext, spy } from "@std/testing/mock";
 * import { deviceInfo, request } from "@hertzg/hikvision-api";
 *
 * const fetch = spy(resolvesNext([
 *   new Response(
 *     "<DeviceInfo><model>DS-7608NI-Q2/8P</model>" +
 *       "<firmwareVersion>V4.75.207</firmwareVersion><deviceType>NVR</deviceType></DeviceInfo>",
 *   ),
 * ]));
 * const nvr = { baseUrl: "http://192.0.2.10", username: "admin", password: "hunter2", fetch };
 *
 * const info = await request(nvr, deviceInfo);
 *
 * assertEquals(info.deviceType, "NVR");
 * assertEquals(fetch.calls[0].args[0], "http://192.0.2.10/ISAPI/System/deviceInfo");
 * const init = fetch.calls[0].args[1] as RequestInit;
 * assertEquals(new Headers(init.headers).get("authorization"), "Basic YWRtaW46aHVudGVyMg==");
 * ```
 *
 * @module
 */

export type { Device } from "./http/send.ts";
export { basicAuthorization } from "./http/basic-authorization.ts";
export { request } from "./isapi/request.ts";
export type { Resource } from "./isapi/request.ts";
export { stream } from "./isapi/stream.ts";
export type { StreamOptions } from "./isapi/stream.ts";
export type { Point } from "./isapi/document/points.ts";
export { IsapiError } from "./isapi/status/isapi-error.ts";
export type { IsapiFailure } from "./isapi/status/isapi-error.ts";
export type { ResponseStatus } from "./isapi/status/parse-response-status.ts";
export { alertStream } from "./isapi/event/alert-stream.ts";
export { parseAlert } from "./isapi/event/parse-alert.ts";
export type {
  Alert,
  AlertRegion,
  TargetRect,
} from "./isapi/event/decode-alert.ts";
export { deviceInfo } from "./isapi/system/device-info.ts";
export type { DeviceInfo } from "./isapi/system/device-info.ts";
export { deviceTime } from "./isapi/system/device-time.ts";
export type { DeviceTime } from "./isapi/system/device-time.ts";
export { parseTimeZoneOffset } from "./isapi/system/parse-time-zone-offset.ts";
export { inputProxyChannels } from "./isapi/content-mgmt/input-proxy-channels.ts";
export type { InputProxyChannel } from "./isapi/content-mgmt/input-proxy-channels.ts";
export { inputProxyChannelStatus } from "./isapi/content-mgmt/input-proxy-channel-status.ts";
export type { InputProxyChannelStatus } from "./isapi/content-mgmt/input-proxy-channel-status.ts";
export { decodeGridMap } from "./isapi/content-mgmt/decode-grid-map.ts";
export { encodeGridMap } from "./isapi/content-mgmt/encode-grid-map.ts";
export { motionDetection } from "./isapi/content-mgmt/motion-detection.ts";
export type {
  MotionDetection,
  MotionDetectionTarget,
  MotionRegion,
} from "./isapi/content-mgmt/motion-detection.ts";
export { motionDetectionCapabilities } from "./isapi/content-mgmt/motion-detection-capabilities.ts";
export type { MotionDetectionCapabilities } from "./isapi/content-mgmt/motion-detection-capabilities.ts";
export { SMART_RULE_TYPES } from "./isapi/smart/smart-rule-types.ts";
export type { SmartRuleType } from "./isapi/smart/smart-rule-types.ts";
export { smartRules } from "./isapi/smart/smart-rules.ts";
export type { SmartRegion, SmartRules } from "./isapi/smart/smart-rules.ts";
export type { SmartRule } from "./isapi/smart/rule-fields.ts";
export type { NormalizedScreenSize } from "./isapi/smart/screen-size.ts";
export { fieldDetection } from "./isapi/smart/field-detection.ts";
export type {
  FieldDetection,
  FieldDetectionRegion,
} from "./isapi/smart/field-detection.ts";
export { lineDetection } from "./isapi/smart/line-detection.ts";
export type {
  LineDetection,
  LineDetectionLine,
} from "./isapi/smart/line-detection.ts";
