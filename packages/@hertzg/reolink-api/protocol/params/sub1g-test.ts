/**
 * `<sub1gTest>`: a factory sub-1 GHz radio test element from the Video
 * Doorbell PoE firmware. No command in the catalog names it.
 *
 * Firmware: the library parser `net_fty_sub1g_x2s` is an empty stub that
 * reads no field. The reply is built in netserver: it writes
 * `correctResult` only when the stored test kind is 3, and otherwise
 * replies with no body at all. The request fields, if any, are not
 * recoverable from the parser.
 *
 * @example Read a reply with a correction result
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { sub1gTest } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<sub1gTest version="1.1"><correctResult>1</correctResult></sub1gTest>',
 * ).root;
 *
 * assertEquals(sub1gTest.decode(root), { correctResult: 1 });
 * ```
 *
 * @module
 */

import { int, optional, type XmlParam, xmlParam } from "../xml.ts";

/** The radio test result in `<sub1gTest>`. */
export type Sub1gTest = {
  /** Reply only: the correction result; its values are not established. */
  correctResult?: number;
};

/**
 * Codec for `<sub1gTest>`.
 *
 * @example Build the element
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { sub1gTest } from "@hertzg/reolink-api/protocol/params";
 *
 * assertEquals(sub1gTest.encode({}), '<sub1gTest version="1.1"></sub1gTest>');
 * ```
 */
export const sub1gTest: XmlParam<"sub1gTest", Sub1gTest> = xmlParam(
  "sub1gTest",
  { correctResult: optional(int()) },
);
