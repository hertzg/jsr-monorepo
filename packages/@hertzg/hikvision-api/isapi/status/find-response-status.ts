/**
 * Finds the `<ResponseStatus>` in a response body, if there is one.
 *
 * @module
 */

import { parse } from "@std/xml";
import {
  parseResponseStatus,
  type ResponseStatus,
} from "./parse-response-status.ts";

/**
 * The `<ResponseStatus>` in a body, if that is what the body is.
 *
 * @param body The response text.
 * @returns The status, or `undefined` when the body is not a `<ResponseStatus>` document.
 *
 * @example A body that is something else
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { findResponseStatus } from "./find-response-status.ts";
 *
 * assertEquals(findResponseStatus("<DeviceInfo/>"), undefined);
 * assertEquals(findResponseStatus("not xml"), undefined);
 * assertEquals(findResponseStatus("<ResponseStatus><statusCode>4</statusCode></ResponseStatus>")?.statusCode, 4);
 * ```
 */
export function findResponseStatus(body: string): ResponseStatus | undefined {
  try {
    const root = parse(body).root;
    return root.name.local === "ResponseStatus"
      ? parseResponseStatus(root)
      : undefined;
  } catch {
    return undefined;
  }
}
