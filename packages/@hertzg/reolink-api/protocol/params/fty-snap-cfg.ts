/**
 * `<ftySnapCfg>`: a factory snapshot configuration. It has no fields, and
 * no registered command carries it.
 *
 * Firmware: `nets_param_fty_snap_cfg_x2s` and `nets_param_fty_snap_cfg_s2x`
 * are empty stubs: the parser reads nothing and the serializer writes
 * nothing, not even the element.
 *
 * @example Build an empty `<ftySnapCfg>` element
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { ftySnapCfg } from "@hertzg/reolink-api/protocol/params";
 *
 * assertEquals(ftySnapCfg.encode({}), '<ftySnapCfg version="1.1"></ftySnapCfg>');
 * ```
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<ftySnapCfg>`: the firmware reads and writes no fields. */
export type FtySnapCfg = Record<PropertyKey, never>;

/**
 * Codec for `<ftySnapCfg>`. It reads any element as `{}`.
 *
 * @example Read a `<ftySnapCfg>` element
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { ftySnapCfg } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse('<ftySnapCfg version="1.1"></ftySnapCfg>').root;
 *
 * assertEquals(ftySnapCfg.decode(root), {});
 * ```
 */
export const ftySnapCfg: XmlParam<"ftySnapCfg", FtySnapCfg> = xmlParam(
  "ftySnapCfg",
  {},
);
