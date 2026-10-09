/**
 * `<AgingTest>`: starts or stops a factory aging (burn-in) test. A factory
 * element that no registered command carries.
 *
 * Firmware: `nets_param_aging_test_x2s` reads each field when present and
 * skips a missing one; it rejects a negative `channelId`. No serializer
 * exists, so the camera never writes this element.
 *
 * @example Build an `<AgingTest>` request
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { agingTest } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = agingTest.encode({ channelId: 0, enable: 1 });
 *
 * assertStringIncludes(xml, "<enable>1</enable>");
 * ```
 *
 * @module
 */

import { int, optional, text, type XmlParam, xmlParam } from "../xml.ts";

/** The aging test request in `<AgingTest>`. */
export type AgingTest = {
  /** Zero-based channel; the firmware rejects a negative value. */
  channelId?: number;
  /** 1 to run the test, 0 to stop it. */
  enable?: number;
  /** File name, up to 127 bytes. */
  fileName?: string;
  /** Size. */
  size?: number;
};

/**
 * Codec for `<AgingTest>`.
 *
 * @example Read an `<AgingTest>` element
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { agingTest } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<AgingTest version="1.1"><channelId>0</channelId><enable>1</enable>' +
 *     "<fileName>aging.bin</fileName><size>4096</size></AgingTest>",
 * ).root;
 *
 * assertEquals(agingTest.decode(root).fileName, "aging.bin");
 * ```
 */
export const agingTest: XmlParam<"AgingTest", AgingTest> = xmlParam(
  "AgingTest",
  {
    channelId: optional(int()),
    enable: optional(int()),
    fileName: optional(text()),
    size: optional(int()),
  },
);
