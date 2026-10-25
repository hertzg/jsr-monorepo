/**
 * Whether a `<ResponseStatus>` means success.
 *
 * @module
 */

import type { ResponseStatus } from "./parse-response-status.ts";

/**
 * Whether a status means success.
 *
 * @param status The parsed `<ResponseStatus>`.
 * @returns `true` for status code `0` or `1`.
 *
 * @example Both OK codes
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { isOk } from "./is-ok.ts";
 *
 * assertEquals(isOk({ statusCode: 1 }), true);
 * assertEquals(isOk({ statusCode: 0 }), true);
 * assertEquals(isOk({ statusCode: 7 }), false);
 * ```
 */
export function isOk(status: ResponseStatus): boolean {
  return status.statusCode === 0 || status.statusCode === 1;
}
