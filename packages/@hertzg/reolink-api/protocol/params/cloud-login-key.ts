/**
 * `<CloudLoginKey>`: whether cloud login is on. Read with cmd 282, written
 * with cmd 283.
 *
 * Firmware: `nets_cloud_login_s2x` writes `enable`, always.
 * `nets_cloud_login_x2s` skips it when missing, so it is optional.
 *
 * @example Read the cmd 282 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { cloudLoginKey } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<CloudLoginKey version="1.1"><enable>1</enable></CloudLoginKey>',
 * ).root;
 *
 * assertEquals(cloudLoginKey.decode(root).enable, 1);
 * ```
 *
 * @module
 */

import { int, optional, type XmlParam, xmlParam } from "../xml.ts";

/** The cloud login switch in `<CloudLoginKey>`. */
export type CloudLoginKey = {
  /** 1 when cloud login is on. */
  enable?: number;
};

/**
 * Codec for `<CloudLoginKey>`.
 *
 * @example Turn cloud login off
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cloudLoginKey } from "@hertzg/reolink-api/protocol/params";
 *
 * assertEquals(
 *   cloudLoginKey.encode({ enable: 0 }),
 *   '<CloudLoginKey version="1.1"><enable>0</enable></CloudLoginKey>',
 * );
 * ```
 */
export const cloudLoginKey: XmlParam<"CloudLoginKey", CloudLoginKey> = xmlParam(
  "CloudLoginKey",
  {
    enable: optional(int()),
  },
);
