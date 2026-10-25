/**
 * One authenticated HTTP request to a path on a device.
 *
 * This is the lowest layer: it builds the URL from the device's base URL
 * and a path, adds Basic authentication, and hands back whatever `fetch`
 * returned. It knows nothing about ISAPI; the layer above reads the
 * status and the body. `fetch` is a field of the device so a test can
 * hand in a stub.
 *
 * @example Send a request with a stubbed fetch
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { resolvesNext, spy } from "@std/testing/mock";
 * import { send } from "./send.ts";
 *
 * const fetch = spy(resolvesNext([new Response("<Time/>")]));
 *
 * const response = await send(
 *   { baseUrl: "http://192.0.2.10", username: "admin", password: "hunter2", fetch },
 *   "/ISAPI/System/time",
 * );
 *
 * assertEquals(await response.text(), "<Time/>");
 * assertEquals(fetch.calls[0].args[0], "http://192.0.2.10/ISAPI/System/time");
 * ```
 *
 * @module
 */

import { basicAuthorization } from "./basic-authorization.ts";
import { resolveUrl } from "./resolve-url.ts";

/**
 * Where a device is and how to log in.
 *
 * Plain data: every function in this package takes it as its first
 * argument, and nothing is cached in it.
 */
export type Device = {
  /** Scheme, host and port, such as `http://192.0.2.10` or `http://192.0.2.10:65001`. */
  baseUrl: string;
  /** The ISAPI user name. */
  username: string;
  /** The ISAPI password. */
  password: string;
  /** The `fetch` to use. Defaults to the global one. */
  fetch?: typeof globalThis.fetch;
};

/**
 * Sends one authenticated request and returns the response as is, whatever
 * its status.
 *
 * @param device Where the device is and how to log in.
 * @param path The path, starting with `/`.
 * @param init Extra request options; `headers`, `method`, `body` and `signal` are passed through.
 * @returns The response.
 *
 * @example The caller's headers and signal go through
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { resolvesNext, spy } from "@std/testing/mock";
 * import { send } from "./send.ts";
 *
 * const fetch = spy(resolvesNext([new Response("")]));
 * const controller = new AbortController();
 *
 * await send(
 *   { baseUrl: "http://192.0.2.10/", username: "admin", password: "hunter2", fetch },
 *   "/ISAPI/System/time",
 *   { headers: { "content-type": "application/xml" }, signal: controller.signal },
 * );
 *
 * const init = fetch.calls[0].args[1] as RequestInit;
 * assertEquals(new Headers(init.headers).get("content-type"), "application/xml");
 * assertEquals(new Headers(init.headers).get("authorization"), "Basic YWRtaW46aHVudGVyMg==");
 * assertEquals(init.signal, controller.signal);
 * ```
 */
export function send(
  device: Device,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const { username, password, fetch = globalThis.fetch } = device;
  const headers = new Headers(init.headers);
  headers.set("authorization", basicAuthorization(username, password));
  return fetch(resolveUrl(device, path), { ...init, headers });
}
