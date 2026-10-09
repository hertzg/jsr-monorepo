/**
 * `<freqCorrectResult>`: the outcome of the radio frequency correction on
 * the Video Doorbell PoE. Read with cmd 606 (`NET_GET_FREQ_CORRECT_RESULT`).
 *
 * Firmware: `nets_param_freq_correct_result_s2x` writes `result` always,
 * mapping stored 1 to `success`, 2 to `fail` and anything else to
 * `unknow` (sic). No parser exists: the element only appears in replies.
 *
 * @example Read a cmd 606 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { freqCorrectResult } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<freqCorrectResult version="1.1"><result>success</result></freqCorrectResult>',
 * ).root;
 *
 * assertEquals(freqCorrectResult.decode(root).result, "success");
 * ```
 *
 * @module
 */

import { oneOf, type XmlParam, xmlParam } from "../xml.ts";

/** The frequency correction outcome in `<freqCorrectResult>`. */
export type FreqCorrectResult = {
  /** The outcome; `unknow` is the firmware's spelling of "unknown". */
  result: "success" | "fail" | "unknow";
};

/**
 * Codec for `<freqCorrectResult>`.
 *
 * @example Build a `<freqCorrectResult>` element
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { freqCorrectResult } from "@hertzg/reolink-api/protocol/params";
 *
 * assertEquals(
 *   freqCorrectResult.encode({ result: "fail" }),
 *   '<freqCorrectResult version="1.1"><result>fail</result></freqCorrectResult>',
 * );
 * ```
 */
export const freqCorrectResult: XmlParam<
  "freqCorrectResult",
  FreqCorrectResult
> = xmlParam("freqCorrectResult", {
  result: oneOf("success", "fail", "unknow"),
});
