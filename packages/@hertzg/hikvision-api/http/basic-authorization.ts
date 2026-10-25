/**
 * The Basic `Authorization` header value for a device login.
 *
 * @module
 */

import { encodeBase64 } from "@std/encoding/base64";

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
 * import { basicAuthorization } from "./basic-authorization.ts";
 *
 * assertEquals(basicAuthorization("admin", "hunter2"), "Basic YWRtaW46aHVudGVyMg==");
 * ```
 */
export function basicAuthorization(username: string, password: string): string {
  const encoder = new TextEncoder();
  return `Basic ${encodeBase64(encoder.encode(`${username}:${password}`))}`;
}
