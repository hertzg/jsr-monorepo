/**
 * Read the security token out of the authenticated landing page.
 */

const TOKEN_PATTERN = /var token="([^"]*)"/;

/**
 * Extracts the `var token="…"` value from the authenticated landing page.
 *
 * @param html Authenticated page body
 * @returns Security token
 * @throws {Error} When the page carries no token, which is how a rejected
 * session surfaces
 *
 * @example Read the token from a landing page
 * ```ts
 * import { assertEquals, assertThrows } from "@std/assert";
 * import { parseTokenIdHtml } from "./token.ts";
 *
 * assertEquals(
 *   parseTokenIdHtml('<script>var token="d41d8cd98f";</script>'),
 *   "d41d8cd98f",
 * );
 * assertThrows(() => parseTokenIdHtml("<html></html>"), Error);
 * ```
 */
export function parseTokenIdHtml(html: string): string {
  const match = html.match(TOKEN_PATTERN);

  if (!match) {
    throw new Error("Token not found in response");
  }

  return match[1];
}
