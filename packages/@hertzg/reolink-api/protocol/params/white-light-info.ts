/**
 * `<whiteLightInfo>`: white light (spotlight) information. It has no fields,
 * and no registered command carries it.
 *
 * Firmware: `net_whitelight_info_x2s` is an empty stub that reads nothing,
 * and there is no serializer, so the camera never writes this element.
 *
 * @example Build an empty `<whiteLightInfo>` element
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { whiteLightInfo } from "@hertzg/reolink-api/protocol/params";
 *
 * assertEquals(whiteLightInfo.encode({}), '<whiteLightInfo version="1.1"></whiteLightInfo>');
 * ```
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<whiteLightInfo>`: the firmware reads and writes no fields. */
export type WhiteLightInfo = Record<PropertyKey, never>;

/**
 * Codec for `<whiteLightInfo>`. It reads any element as `{}`.
 *
 * @example Read a `<whiteLightInfo>` element
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { whiteLightInfo } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse('<whiteLightInfo version="1.1"></whiteLightInfo>').root;
 *
 * assertEquals(whiteLightInfo.decode(root), {});
 * ```
 */
export const whiteLightInfo: XmlParam<"whiteLightInfo", WhiteLightInfo> =
  xmlParam("whiteLightInfo", {});
