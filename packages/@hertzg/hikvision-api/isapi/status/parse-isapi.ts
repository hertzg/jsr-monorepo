/**
 * Parses an ISAPI document and fails when it is a failing `<ResponseStatus>`.
 *
 * @module
 */

import { parse, type XmlElement } from "@std/xml";
import { IsapiError } from "./isapi-error.ts";
import { isOk } from "./is-ok.ts";
import { parseResponseStatus } from "./parse-response-status.ts";

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
 * import { parseIsapi } from "./parse-isapi.ts";
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
