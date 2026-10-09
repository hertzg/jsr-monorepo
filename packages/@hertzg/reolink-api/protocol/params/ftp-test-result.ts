/**
 * `<FtpTestResult>`: the FTP server's answer to a cmd 194 (`FTP_TEST_V20`)
 * connection test.
 *
 * Firmware: the cmd 194 handler in `netserver` builds the element itself and
 * always sends it. It writes `rspCode` and `detail` together, and only when
 * the test produced a result, so the element can be empty. There is no
 * parser: the camera never reads this element.
 *
 * @example Read the cmd 194 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { ftpTestResult } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<FtpTestResult version="1.1"><rspCode>230</rspCode>' +
 *     "<detail>Login successful.</detail></FtpTestResult>",
 * ).root;
 *
 * assertEquals(ftpTestResult.decode(root).rspCode, 230);
 * ```
 *
 * @module
 */

import { int, optional, text, type XmlParam, xmlParam } from "../xml.ts";

/** The FTP test outcome in `<FtpTestResult>`. */
export type FtpTestResult = {
  /** The FTP server's reply code; written only when the test produced a result. */
  rspCode?: number;
  /** The FTP server's reply text; written together with `rspCode`. */
  detail?: string;
};

/**
 * Codec for `<FtpTestResult>`.
 *
 * @example Build an `<FtpTestResult>` element
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { ftpTestResult } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = ftpTestResult.encode({ rspCode: 530, detail: "Login incorrect." });
 *
 * assertStringIncludes(xml, "<rspCode>530</rspCode>");
 * ```
 */
export const ftpTestResult: XmlParam<"FtpTestResult", FtpTestResult> = xmlParam(
  "FtpTestResult",
  {
    rspCode: optional(int()),
    detail: optional(text()),
  },
);
