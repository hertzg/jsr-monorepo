/**
 * Client for the MyMagti API.
 *
 * Currently provides {@link fetchToken} and the other OAuth helpers for
 * obtaining and refreshing OAuth tokens by mimicking the mobile app
 * requests. You can swap the fetch implementation for testing.
 *
 * @example Mocking fetch for tests
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { fetchToken } from "@hertzg/mymagti-api";
 *
 * const mockFetch: typeof fetch = async (_url, _init) => new Response(
 *   JSON.stringify({
 *     access_token: "A",
 *     autoLogin: 0,
 *     expires_in: 3600,
 *     jti: "id",
 *     phoneNo: "5xxxxxxxx",
 *     refresh_token: "R",
 *     scope: "*",
 *     token_type: "bearer",
 *     userId: 1,
 *     userIdentifier: "u",
 *   }),
 *   { status: 200, headers: { "content-type": "application/json" } },
 * );
 *
 * const res = await fetchToken(
 *   { type: "login", username: "u", password: "p" },
 *   { fetch: mockFetch },
 * );
 *
 * assertEquals(res.result, "success");
 * if (res.result === "success") {
 *   assertEquals(typeof res.data.access_token, "string");
 * }
 * ```
 *
 * @module
 */
export * from "./oauth/oauth.ts";
