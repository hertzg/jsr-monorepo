/**
 * `<authInfo>`: asks the Video Doorbell PoE for an authorization code that
 * lets another phone share access. Carried by cmd 509
 * (`AUTH_MODE_CODE_GET`).
 *
 * Firmware: `net_auth_info_x2s` reads whichever request field is present
 * and rejects an `ability` of 0. `net_auth_info_s2x` writes only `code`,
 * always. The request and reply share the element but no field.
 *
 * @example Read a cmd 509 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { authInfo } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse('<authInfo version="1.1"><code>482913</code></authInfo>')
 *   .root;
 *
 * assertEquals(authInfo.decode(root).code, 482913);
 * ```
 *
 * @module
 */

import {
  int,
  optional,
  text,
  u64,
  uint,
  type XmlParam,
  xmlParam,
} from "../xml.ts";

/** The authorization code request and reply in `<authInfo>`. */
export type AuthInfo = {
  /** Request only: a note for the shared user, read up to 32 bytes. */
  notes?: string;
  /** Request only: how many hours the shared access lasts. */
  validhours?: number;
  /** Request only: the shared user's level. */
  userLevel?: number;
  /** Request only: the granted ability bitmask; must not be 0. */
  ability?: number;
  /** Request only: a 64-bit per-channel ability bitmask. */
  channelAbility?: bigint;
  /** Reply only: the authorization code. */
  code?: number;
};

/**
 * Codec for `<authInfo>`.
 *
 * @example Build a cmd 509 request
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { authInfo } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = authInfo.encode({
 *   notes: "Neighbour",
 *   validhours: 24,
 *   userLevel: 0,
 *   ability: 3,
 *   channelAbility: 1n,
 * });
 *
 * assertStringIncludes(xml, "<validhours>24</validhours>");
 * ```
 */
export const authInfo: XmlParam<"authInfo", AuthInfo> = xmlParam("authInfo", {
  notes: optional(text()),
  validhours: optional(int()),
  userLevel: optional(int()),
  ability: optional(uint()),
  channelAbility: optional(u64()),
  code: optional(int()),
});
