/**
 * `<PtzAutoTest>`: the PTZ self-test state in the cmd 340 reply. The
 * request has no body.
 *
 * Firmware: the cmd 340 handler writes `testStat`, always, from the PTZ
 * module's reply.
 *
 * @example Read the cmd 340 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { ptzAutoTest } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<PtzAutoTest version="1.1"><testStat>1</testStat></PtzAutoTest>',
 * ).root;
 *
 * assertEquals(ptzAutoTest.decode(root), { testStat: 1 });
 * ```
 *
 * @module
 */

import { int, type XmlParam, xmlParam } from "../xml.ts";

/** The PTZ self-test state in `<PtzAutoTest>`. */
export type PtzAutoTest = {
  /** Self-test state as a number; the firmware does not name the values. */
  testStat: number;
};

/**
 * Codec for `<PtzAutoTest>`.
 *
 * @example Build a `<PtzAutoTest>` element
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { ptzAutoTest } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = ptzAutoTest.encode({ testStat: 0 });
 *
 * assertStringIncludes(xml, "<testStat>0</testStat>");
 * ```
 */
export const ptzAutoTest: XmlParam<"PtzAutoTest", PtzAutoTest> = xmlParam(
  "PtzAutoTest",
  { testStat: int() },
);
