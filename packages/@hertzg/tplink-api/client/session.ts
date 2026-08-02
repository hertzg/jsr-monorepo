/**
 * Read the session id out of the login response.
 */

/**
 * Extracts the session cookie value from a login response's `Set-Cookie`
 * header.
 *
 * The cookie *name* is not checked — whatever sits between the first `=` and
 * the first `;` is taken as the session id. The router's `deleted` sentinel and
 * a missing header both mean "no session".
 *
 * @param headers Login response headers
 * @returns Session id, or `null` when the router refused the login
 *
 * @example Read an issued session cookie
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseSessionIdHeaders } from "./session.ts";
 *
 * const headers = new Headers([["set-cookie", "JSESSIONID=abc123; Path=/"]]);
 *
 * assertEquals(parseSessionIdHeaders(headers), "abc123");
 * ```
 *
 * @example A refused login yields no session
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseSessionIdHeaders } from "./session.ts";
 *
 * assertEquals(parseSessionIdHeaders(new Headers()), null);
 * assertEquals(
 *   parseSessionIdHeaders(new Headers([["set-cookie", "JSESSIONID=deleted;"]])),
 *   null,
 * );
 * ```
 */
export function parseSessionIdHeaders(headers: Headers): string | null {
  const setCookie = headers.get("set-cookie");
  const cookieValue = setCookie?.slice(
    setCookie.indexOf("=") + 1,
    setCookie.indexOf(";"),
  );

  return cookieValue !== "deleted" ? cookieValue ?? null : null;
}
