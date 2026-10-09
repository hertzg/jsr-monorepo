/**
 * `<T1MicTest>`: a factory microphone test element from the Video Doorbell
 * PoE firmware. No command in the catalog carries it.
 *
 * Firmware: `net_param_t1_mic_test_x2s` and `net_param_t1_mic_test_s2x` are
 * both empty stubs that return success without reading or writing a field,
 * so the element has no fields.
 *
 * @example Build the empty element
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { t1MicTest } from "@hertzg/reolink-api/protocol/params";
 *
 * assertEquals(t1MicTest.encode({}), '<T1MicTest version="1.1"></T1MicTest>');
 * ```
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<T1MicTest>`: the firmware reads and writes no fields. */
export type T1MicTest = Record<PropertyKey, never>;

/**
 * Codec for `<T1MicTest>`.
 *
 * @example Read the element, ignoring any children
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { t1MicTest } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse('<T1MicTest version="1.1"></T1MicTest>').root;
 *
 * assertEquals(t1MicTest.decode(root), {});
 * ```
 */
export const t1MicTest: XmlParam<"T1MicTest", T1MicTest> = xmlParam(
  "T1MicTest",
  {},
);
