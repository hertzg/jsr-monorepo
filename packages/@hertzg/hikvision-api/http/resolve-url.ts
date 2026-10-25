/**
 * The full URL of a path on a device.
 *
 * @module
 */

import type { Device } from "./send.ts";

/**
 * The full URL of a path on a device.
 *
 * @param device Where the device is.
 * @param path The path, starting with `/`.
 * @returns The device's base URL, without trailing slashes, followed by the path.
 *
 * @example A trailing slash on the base URL is dropped
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { resolveUrl } from "./resolve-url.ts";
 *
 * const device = { baseUrl: "http://192.0.2.10:65001/", username: "admin", password: "hunter2" };
 *
 * assertEquals(resolveUrl(device, "/ISAPI/System/time"), "http://192.0.2.10:65001/ISAPI/System/time");
 * ```
 */
export function resolveUrl(device: Device, path: string): string {
  return device.baseUrl.replace(/\/+$/, "") + path;
}
