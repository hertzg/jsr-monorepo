/**
 * `<BandWidthTest>`: turns the network bandwidth test on or off. An element
 * that no registered command carries.
 *
 * Firmware: `nets_param_bandwidth_test_x2s` reads `enable` when present and
 * rejects a negative value. No serializer exists, so the camera never writes
 * this element.
 *
 * @example Build a `<BandWidthTest>` request
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { bandWidthTest } from "@hertzg/reolink-api/protocol/params";
 *
 * assertEquals(
 *   bandWidthTest.encode({ enable: 1 }),
 *   '<BandWidthTest version="1.1"><enable>1</enable></BandWidthTest>',
 * );
 * ```
 *
 * @module
 */

import { int, optional, type XmlParam, xmlParam } from "../xml.ts";

/** The bandwidth test switch in `<BandWidthTest>`. */
export type BandWidthTest = {
  /** 1 to run the test, 0 to stop it; the firmware rejects a negative value. */
  enable?: number;
};

/**
 * Codec for `<BandWidthTest>`.
 *
 * @example Read a `<BandWidthTest>` element
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { bandWidthTest } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<BandWidthTest version="1.1"><enable>0</enable></BandWidthTest>',
 * ).root;
 *
 * assertEquals(bandWidthTest.decode(root), { enable: 0 });
 * ```
 */
export const bandWidthTest: XmlParam<"BandWidthTest", BandWidthTest> = xmlParam(
  "BandWidthTest",
  {
    enable: optional(int()),
  },
);
