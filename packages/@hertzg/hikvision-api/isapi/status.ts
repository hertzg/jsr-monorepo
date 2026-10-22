/**
 * The `<ResponseStatus>` a device answers when a request fails.
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
 * import { IsapiError, parseIsapi } from "./status.ts";
 *
 * const xml = "<ResponseStatus><statusCode>4</statusCode>" +
 *   "<subStatusCode>notSupport</subStatusCode></ResponseStatus>";
 *
 * assertThrows(() => parseIsapi(xml), IsapiError, "notSupport");
 * ```
 *
 * @module
 */

import { isElement, isText, parse, type XmlElement } from "@std/xml";

/** The fields of a `<ResponseStatus>` document. */
export type ResponseStatus = {
  /** The path the device is answering about. */
  requestURL?: string;
  /**
   * `0` or `1` OK, `2` Device Busy, `3` Device Error, `4` Invalid Operation,
   * `5` Invalid XML Format, `6` Invalid XML Content, `7` Reboot Required,
   * `9` Additional Error. `7` can come on a 200 after a PUT.
   */
  statusCode: number;
  /** A short description, such as `Invalid Operation`. */
  statusString?: string;
  /** The precise reason, such as `notSupport`, `lowPrivilege` or `badAuthorization`. */
  subStatusCode?: string;
};

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

/**
 * Whether a status means success.
 *
 * @param status The parsed `<ResponseStatus>`.
 * @returns `true` for status code `0` or `1`.
 *
 * @example Both OK codes
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { isOk } from "./status.ts";
 *
 * assertEquals(isOk({ statusCode: 1 }), true);
 * assertEquals(isOk({ statusCode: 0 }), true);
 * assertEquals(isOk({ statusCode: 7 }), false);
 * ```
 */
export function isOk(status: ResponseStatus): boolean {
  return status.statusCode === 0 || status.statusCode === 1;
}

/**
 * Reads the fields of a `<ResponseStatus>` element.
 *
 * @param element The `<ResponseStatus>` element.
 * @returns The status fields.
 *
 * @example Read a successful status
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { parseResponseStatus } from "./status.ts";
 *
 * const root = parse(
 *   "<ResponseStatus><statusCode>1</statusCode><statusString>OK</statusString></ResponseStatus>",
 * ).root;
 *
 * assertEquals(parseResponseStatus(root), { statusCode: 1, statusString: "OK" });
 * ```
 */
export function parseResponseStatus(element: XmlElement): ResponseStatus {
  const status: ResponseStatus = {
    statusCode: Number(field(element, "statusCode") ?? "0"),
  };
  for (const name of ["requestURL", "statusString", "subStatusCode"] as const) {
    const value = field(element, name);
    if (value !== undefined) {
      status[name] = value;
    }
  }
  return status;
}

/**
 * The `<ResponseStatus>` in a body, if that is what the body is.
 *
 * @param body The response text.
 * @returns The status, or `undefined` when the body is not a `<ResponseStatus>` document.
 *
 * @example A body that is something else
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { findResponseStatus } from "./status.ts";
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

/**
 * Parses an ISAPI document and returns its root element.
 *
 * @param xml The document text.
 * @returns The root element.
 * @throws {IsapiError} When the document is a `<ResponseStatus>` that is not OK.
 *
 * @example Read the root of a device reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseIsapi } from "./status.ts";
 *
 * const root = parseIsapi('<DeviceInfo xmlns="http://www.hikvision.com/ver20/XMLSchema"/>');
 *
 * assertEquals(root.name.local, "DeviceInfo");
 * ```
 */
export function parseIsapi(xml: string): XmlElement {
  const root = parse(xml).root;
  if (root.name.local === "ResponseStatus") {
    const status = parseResponseStatus(root);
    if (!isOk(status)) {
      throw new IsapiError({ status });
    }
  }
  return root;
}

function field(element: XmlElement, name: string): string | undefined {
  const found = element.children.filter(isElement).find((node) =>
    node.name.local === name
  );
  return found?.children.filter(isText).map((node) => node.text).join("");
}
