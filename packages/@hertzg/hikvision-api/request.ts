/**
 * One authenticated HTTP request to an ISAPI path.
 *
 * ISAPI is plain HTTP: `GET /ISAPI/System/deviceInfo` with an
 * `Authorization` header. This layer builds the URL from a base URL and a
 * path, adds Basic authentication, and turns a failed request into an
 * exception that keeps the device's reason:
 *
 * - A non-2xx status whose body is a `<ResponseStatus>` (the spec's 400, 403
 *   and 503) throws an {@link IsapiError} with `httpStatus` set, so a 403
 *   with `notSupport` is told apart from a 403 for a locked account.
 * - A non-2xx status with any other body throws an {@link HttpError}.
 * - A 2xx whose body is a failing `<ResponseStatus>` throws an
 *   {@link IsapiError} without `httpStatus`, from {@link requestXml}.
 *
 * `fetch` is an option so a test can hand in a stub.
 *
 * @example Read a document with a stubbed fetch
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { resolvesNext, spy } from "@std/testing/mock";
 * import { requestXml } from "@hertzg/hikvision-api/request";
 *
 * const fetch = spy(resolvesNext([
 *   new Response("<DeviceInfo><model>DS-2CD2043G2-I</model></DeviceInfo>"),
 * ]));
 *
 * const root = await requestXml(
 *   { baseUrl: "http://192.0.2.10", username: "admin", password: "hunter2", fetch },
 *   "/ISAPI/System/deviceInfo",
 * );
 *
 * assertEquals(root.name.local, "DeviceInfo");
 * assertEquals(fetch.calls[0].args[0], "http://192.0.2.10/ISAPI/System/deviceInfo");
 * ```
 *
 * @module
 */

import { encodeBase64 } from "@std/encoding/base64";
import { parse, type XmlElement } from "@std/xml";
import {
  IsapiError,
  parseIsapi,
  parseResponseStatus,
  type ResponseStatus,
} from "./xml.ts";

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

/** A response with a status outside 200-299 and no `<ResponseStatus>` body. */
export class HttpError extends Error {
  /** The HTTP status code. */
  readonly status: number;
  /** The URL that was requested. */
  readonly url: string;

  /**
   * @param status The HTTP status code.
   * @param url The URL that was requested.
   */
  constructor(status: number, url: string) {
    super(`ISAPI ${url} answered HTTP ${status}`);
    this.name = "HttpError";
    this.status = status;
    this.url = url;
  }
}

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
 * import { basicAuthorization } from "@hertzg/hikvision-api/request";
 *
 * assertEquals(basicAuthorization("admin", "hunter2"), "Basic YWRtaW46aHVudGVyMg==");
 * ```
 */
export function basicAuthorization(username: string, password: string): string {
  const encoder = new TextEncoder();
  return `Basic ${encodeBase64(encoder.encode(`${username}:${password}`))}`;
}

/**
 * Sends one authenticated request and returns the response.
 *
 * @param options Where the device is and how to log in.
 * @param path The ISAPI path, starting with `/`.
 * @param init Extra request options; `headers` and `signal` are passed through.
 * @returns The response, with a 2xx status.
 * @throws {IsapiError} When the status is not 2xx and the body is a
 *   `<ResponseStatus>`; `httpStatus` holds the HTTP status.
 * @throws {HttpError} When the status is not 2xx and the body is anything
 *   else. The body is read and discarded.
 *
 * @example A path the device does not support, answered with HTTP 403
 * ```ts
 * import { assertEquals, assertRejects } from "@std/assert";
 * import { resolvesNext, spy } from "@std/testing/mock";
 * import { request } from "@hertzg/hikvision-api/request";
 * import { IsapiError } from "@hertzg/hikvision-api/xml";
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
 *       "/ISAPI/Smart/LineDetection/1",
 *     ),
 *   IsapiError,
 * );
 *
 * assertEquals(error.httpStatus, 403);
 * assertEquals(error.status.subStatusCode, "notSupport");
 * ```
 *
 * @example Send a request with the right URL and header
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { resolvesNext, spy } from "@std/testing/mock";
 * import { request } from "@hertzg/hikvision-api/request";
 *
 * const fetch = spy(resolvesNext([new Response("ok")]));
 *
 * const response = await request(
 *   { baseUrl: "http://192.0.2.10/", username: "admin", password: "hunter2", fetch },
 *   "/ISAPI/System/deviceInfo",
 * );
 *
 * assertEquals(await response.text(), "ok");
 * assertEquals(fetch.calls[0].args[0], "http://192.0.2.10/ISAPI/System/deviceInfo");
 * const init = fetch.calls[0].args[1] as RequestInit;
 * assertEquals(new Headers(init.headers).get("authorization"), "Basic YWRtaW46aHVudGVyMg==");
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
    const status = tryParseResponseStatus(await response.text());
    if (status !== undefined) {
      throw new IsapiError(status, response.status);
    }
    throw new HttpError(response.status, url);
  }
  return response;
}

/**
 * The `<ResponseStatus>` in `body`, or `undefined` when the body is not
 * XML or its root is something else.
 */
function tryParseResponseStatus(body: string): ResponseStatus | undefined {
  try {
    const root = parse(body).root;
    return root.name.local === "ResponseStatus"
      ? parseResponseStatus(root)
      : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Sends one request and parses the reply as an ISAPI document.
 *
 * @param options Where the device is and how to log in.
 * @param path The ISAPI path, starting with `/`.
 * @param init Extra request options.
 * @returns The reply's root element.
 * @throws {IsapiError} When the body is a failing `<ResponseStatus>`, with
 *   `httpStatus` set when the status was not 2xx.
 * @throws {HttpError} When the status is not 2xx and the body is not a
 *   `<ResponseStatus>`.
 *
 * @example A device that does not support the path
 * ```ts
 * import { assertRejects } from "@std/assert";
 * import { resolvesNext, spy } from "@std/testing/mock";
 * import { requestXml } from "@hertzg/hikvision-api/request";
 * import { IsapiError } from "@hertzg/hikvision-api/xml";
 *
 * const fetch = spy(resolvesNext([
 *   new Response(
 *     "<ResponseStatus><requestURL>/ISAPI/Smart/LineDetection/1</requestURL>" +
 *       "<statusCode>4</statusCode><subStatusCode>notSupport</subStatusCode></ResponseStatus>",
 *   ),
 * ]));
 *
 * await assertRejects(
 *   () =>
 *     requestXml(
 *       { baseUrl: "http://192.0.2.10", username: "admin", password: "hunter2", fetch },
 *       "/ISAPI/Smart/LineDetection/1",
 *     ),
 *   IsapiError,
 *   "notSupport",
 * );
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
