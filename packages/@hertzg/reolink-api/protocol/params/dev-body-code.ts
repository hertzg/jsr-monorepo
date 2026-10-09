/**
 * `<DevBodyCode>`: a factory peripheral body code status. It has no
 * fields, and no registered command carries it.
 *
 * Firmware: `nets_param_fty_peripheral_body_code_stat_x2s` and
 * `nets_param_fty_peripheral_body_code_stat_s2x` are empty stubs: the
 * parser reads nothing and the serializer writes nothing, not even the
 * element.
 *
 * @example Build an empty `<DevBodyCode>` element
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { devBodyCode } from "@hertzg/reolink-api/protocol/params";
 *
 * assertEquals(devBodyCode.encode({}), '<DevBodyCode version="1.1"></DevBodyCode>');
 * ```
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<DevBodyCode>`: the firmware reads and writes no fields. */
export type DevBodyCode = Record<PropertyKey, never>;

/**
 * Codec for `<DevBodyCode>`. It reads any element as `{}`.
 *
 * @example Read a `<DevBodyCode>` element
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { devBodyCode } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse('<DevBodyCode version="1.1"></DevBodyCode>').root;
 *
 * assertEquals(devBodyCode.decode(root), {});
 * ```
 */
export const devBodyCode: XmlParam<"DevBodyCode", DevBodyCode> = xmlParam(
  "DevBodyCode",
  {},
);
