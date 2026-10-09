/**
 * `<ImageCheck>`: a factory peripheral image check status. It has no
 * fields, and no registered command carries it.
 *
 * Firmware: `nets_param_fty_peripheral_image_check_stat_x2s` and
 * `nets_param_fty_peripheral_image_check_stat_s2x` are empty stubs: the
 * parser reads nothing and the serializer writes nothing, not even the
 * element.
 *
 * @example Build an empty `<ImageCheck>` element
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { imageCheck } from "@hertzg/reolink-api/protocol/params";
 *
 * assertEquals(imageCheck.encode({}), '<ImageCheck version="1.1"></ImageCheck>');
 * ```
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<ImageCheck>`: the firmware reads and writes no fields. */
export type ImageCheck = Record<PropertyKey, never>;

/**
 * Codec for `<ImageCheck>`. It reads any element as `{}`.
 *
 * @example Read a `<ImageCheck>` element
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { imageCheck } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse('<ImageCheck version="1.1"></ImageCheck>').root;
 *
 * assertEquals(imageCheck.decode(root), {});
 * ```
 */
export const imageCheck: XmlParam<"ImageCheck", ImageCheck> = xmlParam(
  "ImageCheck",
  {},
);
