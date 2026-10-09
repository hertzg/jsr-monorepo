/**
 * `<PeriPheralStat>`: a factory peripheral charge status parameter that
 * carries no fields. No command in the request table uses it.
 *
 * Firmware (Video Doorbell PoE): the element is registered with
 * `nets_param_fty_peripheral_charge_stat_x2s`, which reads nothing and
 * returns success. No serializer is registered and no netserver code
 * builds the element, so the camera never writes it. The codec writes an
 * empty element and reads any element as `{}`.
 *
 * @example Build an empty `<PeriPheralStat>`
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { periPheralStat } from "@hertzg/reolink-api/protocol/params";
 *
 * assertEquals(
 *   periPheralStat.encode({}),
 *   '<PeriPheralStat version="1.1"></PeriPheralStat>',
 * );
 * ```
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<PeriPheralStat>`: the firmware reads no fields. */
export type PeriPheralStat = Record<PropertyKey, never>;

/**
 * Codec for `<PeriPheralStat>`.
 *
 * @example Read a `<PeriPheralStat>` element
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { periPheralStat } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse('<PeriPheralStat version="1.1"></PeriPheralStat>').root;
 *
 * assertEquals(periPheralStat.decode(root), {});
 * ```
 */
export const periPheralStat: XmlParam<"PeriPheralStat", PeriPheralStat> =
  xmlParam("PeriPheralStat", {});
