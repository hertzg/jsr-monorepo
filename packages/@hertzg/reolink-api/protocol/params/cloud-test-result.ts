/**
 * `<CloudTestResult>`: the outcome of a cloud upload test, in the cmd 367
 * reply. The request has no body.
 *
 * Firmware: the cmd 367 handler writes `rspCode` and `detail`, always. It
 * answers with status 200 when the cloud module succeeded and 400 when it
 * failed, and writes the body either way. Without a module message the
 * firmware fills in `0`/`Success` or `-1`/`Undefined error`.
 *
 * @example Read the cmd 367 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { cloudTestResult } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<CloudTestResult version="1.1"><rspCode>0</rspCode>' +
 *     "<detail>Success</detail></CloudTestResult>",
 * ).root;
 *
 * assertEquals(cloudTestResult.decode(root), { rspCode: 0, detail: "Success" });
 * ```
 *
 * @module
 */

import { int, text, type XmlParam, xmlParam } from "../xml.ts";

/** The cloud test outcome in `<CloudTestResult>`. */
export type CloudTestResult = {
  /** Result code from the cloud module; `0` on success. */
  rspCode: number;
  /** Human-readable result from the cloud module. */
  detail: string;
};

/**
 * Codec for `<CloudTestResult>`.
 *
 * @example Build a `<CloudTestResult>` element
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { cloudTestResult } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = cloudTestResult.encode({ rspCode: -1, detail: "Undefined error" });
 *
 * assertStringIncludes(xml, "<detail>Undefined error</detail>");
 * ```
 */
export const cloudTestResult: XmlParam<"CloudTestResult", CloudTestResult> =
  xmlParam("CloudTestResult", { rspCode: int(), detail: text() });
