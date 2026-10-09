/**
 * `<IrCutInfo>`: IR-cut filter information. It has no fields, and no
 * registered command carries it.
 *
 * Firmware: `net_ir_cut_info_x2s` is an empty stub that reads nothing, and
 * there is no serializer, so the camera never writes this element.
 *
 * @example Build an empty `<IrCutInfo>` element
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { irCutInfo } from "@hertzg/reolink-api/protocol/params";
 *
 * assertEquals(irCutInfo.encode({}), '<IrCutInfo version="1.1"></IrCutInfo>');
 * ```
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<IrCutInfo>`: the firmware reads and writes no fields. */
export type IrCutInfo = Record<PropertyKey, never>;

/**
 * Codec for `<IrCutInfo>`. It reads any element as `{}`.
 *
 * @example Read a `<IrCutInfo>` element
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { irCutInfo } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse('<IrCutInfo version="1.1"></IrCutInfo>').root;
 *
 * assertEquals(irCutInfo.decode(root), {});
 * ```
 */
export const irCutInfo: XmlParam<"IrCutInfo", IrCutInfo> = xmlParam(
  "IrCutInfo",
  {},
);
