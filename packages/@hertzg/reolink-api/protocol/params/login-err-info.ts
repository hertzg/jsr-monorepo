/**
 * `<LoginErrInfo>`: why a cmd 1 (`LOGIN`) attempt was refused, sent with
 * the failure status instead of `<DeviceInfo>`.
 *
 * Firmware: the cmd 1 handler in `netserver` builds the element itself. It
 * writes `remainTimes` only when it is above zero, and `unlockTime` only
 * when it is above zero, so a refusal can carry an empty element. There is
 * no parser: the camera never reads this element.
 *
 * @example Read a refused login
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { loginErrInfo } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<LoginErrInfo version="1.1"><remainTimes>2</remainTimes></LoginErrInfo>',
 * ).root;
 *
 * assertEquals(loginErrInfo.decode(root).remainTimes, 2);
 * ```
 *
 * @module
 */

import { int, optional, type XmlParam, xmlParam } from "../xml.ts";

/** The lockout state in `<LoginErrInfo>`. */
export type LoginErrInfo = {
  /** Attempts left before the account locks; written only when above zero. */
  remainTimes?: number;
  /** How long the account stays locked; written only when above zero. */
  unlockTime?: number;
};

/**
 * Codec for `<LoginErrInfo>`.
 *
 * @example Build a `<LoginErrInfo>` element
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { loginErrInfo } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = loginErrInfo.encode({ unlockTime: 300 });
 *
 * assertStringIncludes(xml, "<unlockTime>300</unlockTime>");
 * ```
 */
export const loginErrInfo: XmlParam<"LoginErrInfo", LoginErrInfo> = xmlParam(
  "LoginErrInfo",
  {
    remainTimes: optional(int()),
    unlockTime: optional(int()),
  },
);
