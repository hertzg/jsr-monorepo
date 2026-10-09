/**
 * `<certificateInfo>`: the HTTPS certificate (cmd 455 reads it, cmd 456
 * imports or clears one).
 *
 * The reply names the files; a request can also carry their contents:
 *
 * ```
 * reply    <enable/><certName/><keyName/>
 * request  <key/><cert/><certName/><keyName/><option/>
 * ```
 *
 * Firmware: `net_param_cert_info_s2x` writes `enable`, `certName` and
 * `keyName`, always. `net_param_cert_info_x2s` reads `key`, `cert`,
 * `certName`, `keyName` and `option` when present and skips the rest, so
 * each field may be missing. It checks both names with
 * `net_check_cert_name` and rejects one that fails.
 *
 * @example Read the cmd 455 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { certificateInfo } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<certificateInfo version="1.1"><enable>1</enable>' +
 *     "<certName>server.crt</certName><keyName>server.key</keyName>" +
 *     "</certificateInfo>",
 * ).root;
 *
 * assertEquals(certificateInfo.decode(root).certName, "server.crt");
 * ```
 *
 * @module
 */

import { int, oneOf, optional, text, type XmlParam, xmlParam } from "../xml.ts";

/** The HTTPS certificate in `<certificateInfo>`. */
export type CertificateInfo = {
  /** Nonzero when a custom certificate is in use; written in replies only. */
  enable?: number;
  /** Certificate file name, up to 255 characters. */
  certName?: string;
  /** Private key file name, up to 255 characters. */
  keyName?: string;
  /** Private key contents, up to 20479 characters; read from requests only. */
  key?: string;
  /** Certificate contents, up to 20479 characters; read from requests only. */
  cert?: string;
  /** What to do with the certificate; the parser ignores any other value. Read from requests only. */
  option?: "import" | "clear";
};

/**
 * Codec for `<certificateInfo>`.
 *
 * @example Import a certificate
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { certificateInfo } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = certificateInfo.encode({
 *   certName: "server.crt",
 *   keyName: "server.key",
 *   key: "-----BEGIN PRIVATE KEY-----",
 *   cert: "-----BEGIN CERTIFICATE-----",
 *   option: "import",
 * });
 *
 * assertStringIncludes(xml, "<option>import</option>");
 * ```
 */
export const certificateInfo: XmlParam<"certificateInfo", CertificateInfo> =
  xmlParam("certificateInfo", {
    enable: optional(int()),
    certName: optional(text()),
    keyName: optional(text()),
    key: optional(text()),
    cert: optional(text()),
    option: optional(oneOf("import", "clear")),
  });
