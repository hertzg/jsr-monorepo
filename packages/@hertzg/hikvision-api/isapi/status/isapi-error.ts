/**
 * The error thrown for a failed ISAPI request, and the `<ResponseStatus>`
 * document a device answers with when a request fails.
 *
 * ISAPI reports failures in the body, on HTTP 400/403/503 per the spec and
 * on 200 on some firmware, so a reader has to look at the root element
 * before trusting the status code:
 *
 * ```xml
 * <ResponseStatus version="2.0" xmlns="http://www.hikvision.com/ver20/XMLSchema">
 * <requestURL>/ISAPI/Smart/FieldDetection/1</requestURL>
 * <statusCode>4</statusCode>
 * <statusString>Invalid Operation</statusString>
 * <subStatusCode>notSupport</subStatusCode>
 * </ResponseStatus>
 * ```
 *
 * @example Detect a not-supported reply
 * ```ts
 * import { assertThrows } from "@std/assert";
 * import { IsapiError } from "./isapi-error.ts";
 * import { parseIsapi } from "./parse-isapi.ts";
 *
 * const xml = "<ResponseStatus><statusCode>4</statusCode>" +
 *   "<subStatusCode>notSupport</subStatusCode></ResponseStatus>";
 *
 * assertThrows(() => parseIsapi(xml), IsapiError, "notSupport");
 * ```
 *
 * @module
 */

import type { ResponseStatus } from "./parse-response-status.ts";

/** What an {@link IsapiError} knows about the failure. */
export type IsapiFailure = {
  /** The URL that was requested, or the `<requestURL>` the device named. */
  url?: string;
  /** The HTTP status, when the failure came with one outside 2xx. */
  httpStatus?: number;
  /** The `<ResponseStatus>` in the body, when there was one. */
  status?: ResponseStatus;
};

/**
 * A failed ISAPI request: a status outside 2xx, a failing
 * `<ResponseStatus>` in the body, or both.
 *
 * Every field is optional because devices report failures either way.
 * Branch on `subStatusCode` for the reason (`notSupport`,
 * `badAuthorization`, …) and on `httpStatus` for the transport.
 *
 * @example Build an error from a failing body
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { IsapiError } from "./isapi-error.ts";
 *
 * const error = new IsapiError({
 *   httpStatus: 403,
 *   status: { statusCode: 4, subStatusCode: "notSupport" },
 * });
 *
 * assertEquals(error.subStatusCode, "notSupport");
 * assertEquals(error.message, "ISAPI request failed: HTTP 403, 4 notSupport");
 * ```
 */
export class IsapiError extends Error {
  /** The URL that was requested, or the `<requestURL>` the device named. */
  readonly url?: string;
  /** The HTTP status, when outside 2xx. */
  readonly httpStatus?: number;
  /** The `<statusCode>` of the body, when it was a `<ResponseStatus>`. */
  readonly statusCode?: number;
  /** The `<subStatusCode>` of the body, such as `notSupport`. */
  readonly subStatusCode?: string;
  /** The `<statusString>` of the body, such as `Invalid Operation`. */
  readonly statusString?: string;

  /**
   * @param failure What is known about the failure.
   */
  constructor(failure: IsapiFailure) {
    const { url = failure.status?.requestURL, httpStatus, status } = failure;
    const parts = [
      httpStatus === undefined ? undefined : `HTTP ${httpStatus}`,
      status === undefined
        ? undefined
        : `${status.statusCode} ${
          status.subStatusCode ?? status.statusString ?? ""
        }`.trimEnd(),
    ].filter((part) => part !== undefined);
    super(`ISAPI ${url ?? "request"} failed: ${parts.join(", ")}`);
    this.name = "IsapiError";
    Object.assign(
      this,
      url === undefined ? {} : { url },
      httpStatus === undefined ? {} : { httpStatus },
      status === undefined ? {} : {
        statusCode: status.statusCode,
        ...(status.subStatusCode === undefined
          ? {}
          : { subStatusCode: status.subStatusCode }),
        ...(status.statusString === undefined
          ? {}
          : { statusString: status.statusString }),
      },
    );
  }
}
