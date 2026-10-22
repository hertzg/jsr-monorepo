/**
 * Hikvision ISAPI client: the alert stream and a few config documents, for
 * an NVR or a camera.
 *
 * ISAPI is Hikvision's HTTP API. This package speaks the part of it a
 * monitoring tool needs: subscribe to `/ISAPI/Event/notification/alertStream`
 * and read alerts as they arrive, and read the device info, channel list,
 * motion grid and smart rules as typed objects. It authenticates with Basic
 * auth, takes a `fetch` so tests run without a device, and runs on Deno and
 * Bun, or anywhere else `fetch` and web streams exist. An NVR also fronts
 * each camera's own ISAPI on a virtual host port:
 * `baseUrl: "http://<nvr>:65002"` reaches camera 2 through the NVR.
 *
 * ```
 * createClient({ baseUrl, username, password })
 *   .subscribe({ signal })  ─> GET alertStream ─> multipart parts ─> Alert, Alert, …
 *   .deviceInfo()           ─> GET /ISAPI/System/deviceInfo
 *   .channels()             ─> GET /ISAPI/ContentMgmt/InputProxy/channels
 *   .motionDetection(…)     ─> GET …/motionDetection, gridMap decoded
 *   .fieldDetection(…)      ─> GET /ISAPI/Smart/FieldDetection/<id>
 *   .lineDetection(…)       ─> GET /ISAPI/Smart/LineDetection/<id>
 * ```
 *
 * The client does not reconnect, keep timers, or decide when motion ended.
 * A device posts `VMD active` about once a second while motion lasts; VMD
 * never posts `inactive`, though some smart events do. Every alert carries
 * its arrival time in `at` so the consumer can apply its own silence
 * threshold.
 *
 * Every layer is its own entry point: `xml`, `request`, `multipart/parts`,
 * `events/alert`, `events/stream`, `config/device-info`, `config/channels`,
 * `config/motion-detection`, `config/smart` and `client`.
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

export { createClient } from "./client.ts";
export type {
  Client,
  ClientOptions,
  SmartRuleOptions,
  SmartRulesOptions,
  SubscribeOptions,
} from "./client.ts";
export { HttpError } from "./request.ts";
export type { RequestOptions } from "./request.ts";
export { IsapiError } from "./xml.ts";
export type { Point, ResponseStatus } from "./xml.ts";
export { parseAlert } from "./events/alert.ts";
export type { Alert, AlertRegion, TargetRect } from "./events/alert.ts";
export { openAlertStream } from "./events/stream.ts";
export type { AlertStreamOptions } from "./events/stream.ts";
export type { DeviceInfo } from "./config/device-info.ts";
export { parseTimeZoneOffset } from "./config/time.ts";
export type { DeviceTime } from "./config/time.ts";
export type { InputProxyChannel } from "./config/channels.ts";
export type { InputProxyChannelStatus } from "./config/channel-status.ts";
export { decodeGridMap, encodeGridMap } from "./config/grid-map.ts";
export type {
  MotionDetection,
  MotionDetectionTarget,
  MotionRegion,
} from "./config/motion-detection.ts";
export type { MotionDetectionCapabilities } from "./config/motion-capabilities.ts";
export { SMART_RULE_TYPES } from "./config/smart.ts";
export type {
  FieldDetection,
  FieldDetectionRegion,
  NormalizedScreenSize,
  SmartRegion,
  SmartRule,
  SmartRules,
  SmartRuleType,
} from "./config/smart.ts";
export type {
  LineDetection,
  LineDetectionLine,
} from "./config/line-detection.ts";
