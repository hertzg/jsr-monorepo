/**
 * `<BindCloud>`: a request to bind the camera to a cloud account, sent
 * with cmd 269.
 *
 * Firmware: `nets_bind_cloud_x2s` reads `authToken` when present, so it
 * is optional. No firmware code writes this element.
 *
 * @example Build a cmd 269 request
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { bindCloud } from "@hertzg/reolink-api/protocol/params";
 *
 * assertEquals(
 *   bindCloud.encode({ authToken: "token-abc123" }),
 *   '<BindCloud version="1.1"><authToken>token-abc123</authToken></BindCloud>',
 * );
 * ```
 *
 * @module
 */

import { optional, text, type XmlParam, xmlParam } from "../xml.ts";

/** The bind request in `<BindCloud>`. */
export type BindCloud = {
  /** Cloud authorization token, read into a 128-byte buffer. */
  authToken?: string;
};

/**
 * Codec for `<BindCloud>`.
 *
 * @example Read a `<BindCloud>` element
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { bindCloud } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<BindCloud version="1.1"><authToken>token-xyz789</authToken></BindCloud>',
 * ).root;
 *
 * assertEquals(bindCloud.decode(root), { authToken: "token-xyz789" });
 * ```
 */
export const bindCloud: XmlParam<"BindCloud", BindCloud> = xmlParam(
  "BindCloud",
  {
    authToken: optional(text()),
  },
);
