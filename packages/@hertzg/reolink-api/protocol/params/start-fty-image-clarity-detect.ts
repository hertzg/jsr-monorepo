/**
 * `<startFtyImageClarityDetect>`: starts the factory image clarity check
 * with its thresholds and fixed exposure and white balance. A factory
 * element that no registered command carries.
 *
 * Firmware: `net_fty_image_clarity_detect_para_x2s` reads each field when
 * present and skips a missing one. `net_fty_image_clarity_detect_para_s2x`
 * is an empty stub, so the camera never writes this element.
 *
 * @example Build a `<startFtyImageClarityDetect>` request
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { startFtyImageClarityDetect } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = startFtyImageClarityDetect.encode({
 *   threshold: "60,55,50,45,40",
 *   desc: "lens-a",
 * });
 *
 * assertStringIncludes(xml, "<threshold>60,55,50,45,40</threshold>");
 * ```
 *
 * @module
 */

import { int, optional, text, type XmlParam, xmlParam } from "../xml.ts";

/** The image clarity check settings in `<startFtyImageClarityDetect>`. */
export type StartFtyImageClarityDetect = {
  /**
   * Up to 5 comma-separated integers, such as `60,55,50,45,40`; the
   * firmware rejects a value it cannot split.
   */
  threshold?: string;
  /** Auto exposure time. */
  aeExpTime?: number;
  /** Auto exposure ISO gain. */
  aeIsoGain?: number;
  /** White balance red gain. */
  awbRgain?: number;
  /** White balance green gain. */
  awbGgain?: number;
  /** White balance blue gain. */
  awbBgain?: number;
  /** Description, up to 31 bytes. */
  desc?: string;
};

/**
 * Codec for `<startFtyImageClarityDetect>`.
 *
 * @example Read a `<startFtyImageClarityDetect>` element
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { startFtyImageClarityDetect } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<startFtyImageClarityDetect version="1.1">' +
 *     "<threshold>60,55</threshold><aeIsoGain>200</aeIsoGain>" +
 *     "</startFtyImageClarityDetect>",
 * ).root;
 *
 * assertEquals(startFtyImageClarityDetect.decode(root), {
 *   threshold: "60,55",
 *   aeIsoGain: 200,
 * });
 * ```
 */
export const startFtyImageClarityDetect: XmlParam<
  "startFtyImageClarityDetect",
  StartFtyImageClarityDetect
> = xmlParam("startFtyImageClarityDetect", {
  threshold: optional(text()),
  aeExpTime: optional(int()),
  aeIsoGain: optional(int()),
  awbRgain: optional(int()),
  awbGgain: optional(int()),
  awbBgain: optional(int()),
  desc: optional(text()),
});
