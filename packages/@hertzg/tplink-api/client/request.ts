/**
 * Request building blocks shared by every dialect.
 *
 * These are the pieces of request construction that are invariant across the
 * firmware family: the origin-root `Referer`, the session cookie, and the
 * `sign=…\r\ndata=…\r\n` envelope framing.
 */

import type { Envelope, SessionContext } from "../dialect/dialect.ts";

/**
 * Origin-root URL of the router, used as the `Referer` on every request.
 *
 * @param baseUrl Base URL of the router
 * @returns Absolute URL of the router's root page
 *
 * @example Root href from a bare origin
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { rootHref } from "./request.ts";
 *
 * assertEquals(rootHref("http://192.168.1.1"), "http://192.168.1.1/");
 * assertEquals(rootHref("http://192.168.1.1/sub/"), "http://192.168.1.1/");
 * ```
 */
export function rootHref(baseUrl: string): string {
  return new URL("/", baseUrl).href;
}

/**
 * `Cookie` header value carrying the login attempt counter and the session id.
 *
 * @param session Session id and login attempt counter
 * @returns Cookie header value
 *
 * @example Cookie for an established session
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { sessionCookie } from "./request.ts";
 *
 * assertEquals(
 *   sessionCookie({ sessionId: "abc123", authTimes: 1 }),
 *   "loginErrorShow=1; JSESSIONID=abc123",
 * );
 * ```
 */
export function sessionCookie(
  session: Pick<SessionContext, "sessionId" | "authTimes">,
): string {
  return `loginErrorShow=${session.authTimes}; JSESSIONID=${session.sessionId}`;
}

/**
 * Frames an envelope as a request body: `sign` first, `data` second,
 * CRLF-separated, with a trailing CRLF.
 *
 * @param envelope Encrypted request envelope
 * @returns Request body bytes as a string
 *
 * @example Envelope framing
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { envelopeBody } from "./request.ts";
 *
 * assertEquals(
 *   envelopeBody({ data: "ZGF0YQ==", sign: "00ff" }),
 *   "sign=00ff\r\ndata=ZGF0YQ==\r\n",
 * );
 * ```
 */
export function envelopeBody(envelope: Envelope): string {
  return [`sign=${envelope.sign}`, `data=${envelope.data}`, ""].join("\r\n");
}
