/**
 * Reads the fields of a `<ResponseStatus>` element.
 *
 * @module
 */

import { isElement, isText, type XmlElement } from "@std/xml";

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
 * import { parseResponseStatus } from "./parse-response-status.ts";
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

function field(element: XmlElement, name: string): string | undefined {
  const found = element.children.filter(isElement).find((node) =>
    node.name.local === name
  );
  return found?.children.filter(isText).map((node) => node.text).join("");
}
