/**
 * One request to an ISAPI resource, decoded.
 *
 * A {@link Resource} is a path plus the codec of the document behind it.
 * {@link request} takes a device and either a path, for the raw response
 * of the layer below, or a resource, for the decoded document. It is
 * shaped like `fetch(input, init)`: the second argument says what you get
 * back.
 *
 * ```
 * request(device, "/ISAPI/System/time")   -> Response       (nothing read)
 * request(device, deviceTime)             -> DeviceTime     (decoded, failures thrown)
 * ```
 *
 * With a resource, every failure is an {@link IsapiError}: a status
 * outside 2xx, with the `<ResponseStatus>` from the body when there is
 * one, or a failing `<ResponseStatus>` on a 2xx, which some firmware
 * sends.
 *
 * @example Read a resource with a stubbed fetch
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { resolvesNext, spy } from "@std/testing/mock";
 * import { document, text } from "./document.ts";
 * import { request } from "./request.ts";
 *
 * const fetch = spy(resolvesNext([new Response("<DeviceInfo><model>X</model></DeviceInfo>")]));
 *
 * const info = await request(
 *   { baseUrl: "http://192.0.2.10", username: "admin", password: "hunter2", fetch },
 *   { path: "/ISAPI/System/deviceInfo", codec: document({ model: text() }) },
 * );
 *
 * assertEquals(info, { model: "X" });
 * assertEquals(fetch.calls[0].args[0], "http://192.0.2.10/ISAPI/System/deviceInfo");
 * ```
 *
 * @module
 */

import { type Device, resolveUrl, send } from "../http/request.ts";
import type { Document } from "./document.ts";
import { findResponseStatus, IsapiError } from "./status.ts";

/**
 * One ISAPI resource: where it is and how to read it.
 *
 * A resource that takes parameters is a function returning one, such as
 * `motionDetection({ channel: 2 })`.
 *
 * @template T The decoded value.
 */
export type Resource<T> = {
  /** The ISAPI path, starting with `/`. */
  path: string;
  /** How to read the reply. */
  codec: Document<T>;
};

/**
 * Sends one request to a path and returns the response as is.
 *
 * @param device Where the device is and how to log in.
 * @param path The path, starting with `/`.
 * @param init Extra request options, passed to `fetch`.
 * @returns The response, whatever its status.
 */
export function request(
  device: Device,
  path: string,
  init?: RequestInit,
): Promise<Response>;
/**
 * Reads one resource from a device.
 *
 * @template T The decoded value.
 * @param device Where the device is and how to log in.
 * @param resource What to read and how to decode it.
 * @param init Extra request options, passed to `fetch`.
 * @returns The decoded document.
 * @throws {IsapiError} When the request fails: a status outside 2xx, or a failing `<ResponseStatus>` on any status.
 */
export function request<T>(
  device: Device,
  resource: Resource<T>,
  init?: RequestInit,
): Promise<T>;
/**
 * Sends one request: raw for a path, decoded for a resource.
 *
 * @template T The decoded value.
 * @param device Where the device is and how to log in.
 * @param target A path for the raw response, or a resource for the decoded document.
 * @param init Extra request options, passed to `fetch`.
 * @returns The response for a path; the decoded document for a resource.
 * @throws {IsapiError} For a resource, when the request fails: a status outside 2xx, or a failing `<ResponseStatus>` on any status.
 *
 * @example A 403 keeps the device's reason
 * ```ts
 * import { assertEquals, assertRejects } from "@std/assert";
 * import { resolvesNext, spy } from "@std/testing/mock";
 * import { document, text } from "./document.ts";
 * import { request } from "./request.ts";
 * import { IsapiError } from "./status.ts";
 *
 * const fetch = spy(resolvesNext([
 *   new Response(
 *     "<ResponseStatus><statusCode>4</statusCode><subStatusCode>notSupport</subStatusCode></ResponseStatus>",
 *     { status: 403 },
 *   ),
 * ]));
 *
 * const error = await assertRejects(
 *   () =>
 *     request(
 *       { baseUrl: "http://192.0.2.10", username: "admin", password: "hunter2", fetch },
 *       { path: "/ISAPI/Smart/FieldDetection/1", codec: document({ id: text() }) },
 *     ),
 *   IsapiError,
 *   "notSupport",
 * );
 * assertEquals(error.httpStatus, 403);
 * ```
 *
 * @example A path hands back the response untouched
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { resolvesNext, spy } from "@std/testing/mock";
 * import { request } from "./request.ts";
 *
 * const fetch = spy(resolvesNext([new Response("Unauthorized", { status: 401 })]));
 *
 * const response = await request(
 *   { baseUrl: "http://192.0.2.10", username: "admin", password: "hunter2", fetch },
 *   "/ISAPI/System/time",
 * );
 *
 * assertEquals(response.status, 401);
 * ```
 */
export async function request<T>(
  device: Device,
  target: string | Resource<T>,
  init: RequestInit = {},
): Promise<Response | T> {
  if (typeof target === "string") {
    return send(device, target, init);
  }
  const response = await send(device, target.path, init);
  const body = await response.text();
  if (!response.ok) {
    throw new IsapiError({
      url: resolveUrl(device, target.path),
      httpStatus: response.status,
      status: findResponseStatus(body),
    });
  }
  return target.codec.parse(body);
}
