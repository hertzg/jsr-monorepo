/**
 * One authenticated HTTP request to an ISAPI path.
 *
 * Builds the URL from a base URL and a path, adds Basic authentication,
 * and turns every failure into an {@link IsapiError}: a status outside 2xx,
 * a failing `<ResponseStatus>` in the body, or both. `fetch` is an option
 * so a test can hand in a stub.
 *
 * @example Read a document with a stubbed fetch
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { resolvesNext, spy } from "@std/testing/mock";
 * import { document, text } from "./document.ts";
 * import { readDocument } from "./request.ts";
 *
 * const fetch = spy(resolvesNext([new Response("<DeviceInfo><model>X</model></DeviceInfo>")]));
 *
 * const info = await readDocument(
 *   { baseUrl: "http://192.0.2.10", username: "admin", password: "hunter2", fetch },
 *   "/ISAPI/System/deviceInfo",
 *   document({ model: text() }),
 * );
 *
 * assertEquals(info, { model: "X" });
 * assertEquals(fetch.calls[0].args[0], "http://192.0.2.10/ISAPI/System/deviceInfo");
 * ```
 *
 * @module
 */

import { encodeBase64 } from "@std/encoding/base64";
import type { XmlElement } from "@std/xml";
import type { Document } from "./document.ts";
import { findResponseStatus, IsapiError, parseIsapi } from "./status.ts";

/** Where the device is and how to log in. */
export type RequestOptions = {
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
 * The value of a Basic `Authorization` header.
 *
 * @param username The user name.
 * @param password The password.
 * @returns `Basic ` followed by the base64 of `username:password`.
 *
 * @example Build the header
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { basicAuthorization } from "./request.ts";
 *
 * assertEquals(basicAuthorization("admin", "hunter2"), "Basic YWRtaW46aHVudGVyMg==");
 * ```
 */
export function basicAuthorization(username: string, password: string): string {
  const encoder = new TextEncoder();
  return `Basic ${encodeBase64(encoder.encode(`${username}:${password}`))}`;
}

/**
 * Sends one authenticated request and returns the 2xx response.
 *
 * @param options Where the device is and how to log in.
 * @param path The ISAPI path, starting with `/`.
 * @param init Extra request options; `headers` and `signal` are passed through.
 * @returns The response.
 * @throws {IsapiError} When the request fails: a status outside 2xx, or a failing `<ResponseStatus>` on any status.
 *
 * @example A 403 keeps the device's reason
 * ```ts
 * import { assertEquals, assertRejects } from "@std/assert";
 * import { resolvesNext, spy } from "@std/testing/mock";
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
 *       "/ISAPI/Smart/FieldDetection/1",
 *     ),
 *   IsapiError,
 *   "notSupport",
 * );
 * assertEquals(error.httpStatus, 403);
 * ```
 */
export async function request(
  options: RequestOptions,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const { baseUrl, username, password, fetch = globalThis.fetch } = options;
  const url = baseUrl.replace(/\/+$/, "") + path;
  const headers = new Headers(init.headers);
  headers.set("authorization", basicAuthorization(username, password));
  const response = await fetch(url, { ...init, headers });
  if (!response.ok) {
    const status = findResponseStatus(await response.text());
    throw new IsapiError({ url, httpStatus: response.status, status });
  }
  return response;
}

/**
 * Sends one request and parses the reply as an ISAPI document.
 *
 * @param options Where the device is and how to log in.
 * @param path The ISAPI path, starting with `/`.
 * @param init Extra request options.
 * @returns The reply's root element.
 * @throws {IsapiError} When the request fails: a status outside 2xx, or a failing `<ResponseStatus>` on any status.
 *
 * @example Reach a document this package has no reader for
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { resolvesNext, spy } from "@std/testing/mock";
 * import { requestXml } from "./request.ts";
 *
 * const fetch = spy(resolvesNext([new Response("<Time><timeMode>NTP</timeMode></Time>")]));
 *
 * const root = await requestXml(
 *   { baseUrl: "http://192.0.2.10", username: "admin", password: "hunter2", fetch },
 *   "/ISAPI/System/time",
 * );
 *
 * assertEquals(root.name.local, "Time");
 * ```
 */
export async function requestXml(
  options: RequestOptions,
  path: string,
  init: RequestInit = {},
): Promise<XmlElement> {
  const response = await request(options, path, init);
  return parseIsapi(await response.text());
}

/**
 * Sends one request and decodes the reply with a document codec.
 *
 * @param options Where the device is and how to log in.
 * @param path The ISAPI path, starting with `/`.
 * @param codec The document description.
 * @returns The decoded document.
 * @throws {IsapiError} When the request fails: a status outside 2xx, or a failing `<ResponseStatus>` on any status.
 *
 * @example Read a document that is missing a required element
 * ```ts
 * import { assertRejects } from "@std/assert";
 * import { resolvesNext, spy } from "@std/testing/mock";
 * import { document, text } from "./document.ts";
 * import { readDocument } from "./request.ts";
 *
 * const fetch = spy(resolvesNext([new Response("<DeviceInfo/>")]));
 *
 * await assertRejects(
 *   () =>
 *     readDocument(
 *       { baseUrl: "http://192.0.2.10", username: "admin", password: "hunter2", fetch },
 *       "/ISAPI/System/deviceInfo",
 *       document({ model: text() }),
 *     ),
 *   Error,
 *   "<DeviceInfo> has no <model>",
 * );
 * ```
 */
export async function readDocument<T>(
  options: RequestOptions,
  path: string,
  codec: Document<T>,
): Promise<T> {
  return codec.decode(await requestXml(options, path));
}
