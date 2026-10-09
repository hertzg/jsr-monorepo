/**
 * `<Button443>`: a factory 433 MHz button test parameter that carries no
 * fields. No command in the request table uses it.
 *
 * Firmware (Video Doorbell PoE): the element is registered with
 * `nets_param_fty_peripheral_433_btn_x2s`, which reads nothing and returns
 * success. No serializer is registered and no netserver code builds the
 * element, so the camera never writes it. The codec writes an empty
 * element and reads any element as `{}`.
 *
 * @example Build an empty `<Button443>`
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { button443 } from "@hertzg/reolink-api/protocol/params";
 *
 * assertEquals(button443.encode({}), '<Button443 version="1.1"></Button443>');
 * ```
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<Button443>`: the firmware reads no fields. */
export type Button443 = Record<PropertyKey, never>;

/**
 * Codec for `<Button443>`.
 *
 * @example Read a `<Button443>` element
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { button443 } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse('<Button443 version="1.1"></Button443>').root;
 *
 * assertEquals(button443.decode(root), {});
 * ```
 */
export const button443: XmlParam<"Button443", Button443> = xmlParam(
  "Button443",
  {},
);
