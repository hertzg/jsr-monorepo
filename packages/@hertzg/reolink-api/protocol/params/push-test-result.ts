/**
 * `<PushTestResult>`: the outcome of a push notification test, in the
 * cmd 358 reply. The request has no body.
 *
 * Firmware: the cmd 358 handler writes `rspCode` and `detail`, always. It
 * answers with status 200 when the push module succeeded and 400 when it
 * failed, and writes the body either way. Without a module message the
 * firmware fills in `0`/`Success` or `-1`/`Undefined error`.
 *
 * @example Read the cmd 358 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { pushTestResult } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<PushTestResult version="1.1"><rspCode>0</rspCode>' +
 *     "<detail>Success</detail></PushTestResult>",
 * ).root;
 *
 * assertEquals(pushTestResult.decode(root), { rspCode: 0, detail: "Success" });
 * ```
 *
 * @module
 */

import { int, text, type XmlParam, xmlParam } from "../xml.ts";

/** The push test outcome in `<PushTestResult>`. */
export type PushTestResult = {
  /** Result code from the push module; `0` on success. */
  rspCode: number;
  /** Human-readable result from the push module. */
  detail: string;
};

/**
 * Codec for `<PushTestResult>`.
 *
 * @example Build a `<PushTestResult>` element
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { pushTestResult } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = pushTestResult.encode({ rspCode: -1, detail: "Undefined error" });
 *
 * assertStringIncludes(xml, "<rspCode>-1</rspCode>");
 * ```
 */
export const pushTestResult: XmlParam<"PushTestResult", PushTestResult> =
  xmlParam("PushTestResult", { rspCode: int(), detail: text() });
