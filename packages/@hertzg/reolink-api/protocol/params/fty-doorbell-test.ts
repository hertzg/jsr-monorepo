/**
 * `<ftyDoorbellTest>`: a factory test of the doorbell button. No command in
 * the request table uses it.
 *
 * Firmware (Video Doorbell PoE): `net_fty_doorbell_test_x2s` reads each
 * field when present and skips the rest. It rejects a `testDuration`
 * outside 1 to 300, a `testTimes` below 1, a negative `testTotalCount` and
 * an `op` above 2. `net_fty_doorbell_test_s2x` writes nothing, so the
 * camera never sends this element. Every field is optional.
 *
 * @example Build a test request
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { ftyDoorbellTest } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = ftyDoorbellTest.encode({ testDuration: 60, testTimes: 5, op: 1 });
 *
 * assertStringIncludes(xml, "<testDuration>60</testDuration>");
 * ```
 *
 * @module
 */

import { int, optional, type XmlParam, xmlParam } from "../xml.ts";

/** The factory doorbell button test in `<ftyDoorbellTest>`. */
export type FtyDoorbellTest = {
  /** Test duration, 1 to 300. The unit is not established. */
  testDuration?: number;
  /** How many times to test, 1 or more. */
  testTimes?: number;
  /** Test result. Its values are not established. */
  result?: number;
  /** Test operation, 0 to 2. What each value means is not established. */
  op?: number;
  /** Total test count, 0 or more. */
  testTotalCount?: number;
};

/**
 * Codec for `<ftyDoorbellTest>`.
 *
 * @example Read a `<ftyDoorbellTest>` element
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { ftyDoorbellTest } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   "<ftyDoorbellTest><op>2</op><testTotalCount>10</testTotalCount></ftyDoorbellTest>",
 * ).root;
 *
 * assertEquals(ftyDoorbellTest.decode(root), { op: 2, testTotalCount: 10 });
 * ```
 */
export const ftyDoorbellTest: XmlParam<"ftyDoorbellTest", FtyDoorbellTest> =
  xmlParam("ftyDoorbellTest", {
    testDuration: optional(int()),
    testTimes: optional(int()),
    result: optional(int()),
    op: optional(int()),
    testTotalCount: optional(int()),
  });
