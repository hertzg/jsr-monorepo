/**
 * `<doorbellDingdingtest>`: the result of a factory chime (dingdong) test.
 * No command in the request table uses it.
 *
 * Firmware (Video Doorbell PoE): the element is registered with
 * `net_fty_db_dingdong_x2s`, which reads nothing. The reply is built in
 * netserver (0x8d598, `nets_system.cpp`), and its fields depend on an
 * internal test code that is not part of the XML:
 *
 * ```
 * code 0       freq
 * code 5       up to 10 <update> { result, curVer, reqVer }
 * code 7       sub1gTestResult
 * code 8       freq, curFreq, sub1gTestResult
 * code 11, 12  up to 10 <dingdongTestResult> { state, verifyResult, agingResult }
 * other        no body at all
 * ```
 *
 * Every top-level field is optional. Inside an item every field is always
 * written.
 *
 * @example Read a chime aging test reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { doorbellDingdingtest } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<doorbellDingdingtest version="1.1"><dingdongTestResult><state>1</state>' +
 *     "<verifyResult>0</verifyResult><agingResult>1</agingResult>" +
 *     "</dingdongTestResult></doorbellDingdingtest>",
 * ).root;
 *
 * assertEquals(doorbellDingdingtest.decode(root).dingdongTestResult, [
 *   { state: 1, verifyResult: 0, agingResult: 1 },
 * ]);
 * ```
 *
 * @module
 */

import {
  int,
  obj,
  optional,
  repeated,
  text,
  type XmlParam,
  xmlParam,
} from "../xml.ts";

/** One chime firmware update, an `<update>` in `<doorbellDingdingtest>`. */
export type DoorbellDingdingtestUpdate = {
  /** Update result. Its values are not established. */
  result: number;
  /** Current chime firmware version. */
  curVer: string;
  /** Requested chime firmware version. */
  reqVer: string;
};

/** One chime test, a `<dingdongTestResult>` in `<doorbellDingdingtest>`. */
export type DoorbellDingdingtestResult = {
  /** Chime state. Its values are not established. */
  state: number;
  /** Verification result. Its values are not established. */
  verifyResult: number;
  /** Aging test result. Its values are not established. */
  agingResult: number;
};

/** The factory chime test result in `<doorbellDingdingtest>`. */
export type DoorbellDingdingtest = {
  /** Frequency; test codes 0 and 8. The unit is not established. */
  freq?: number;
  /** Current frequency; test code 8. */
  curFreq?: number;
  /** Sub-1 GHz radio test result; test codes 7 and 8. */
  sub1gTestResult?: number;
  /** Chime firmware updates; test code 5, up to 10. */
  update?: DoorbellDingdingtestUpdate[];
  /** Chime test results; test codes 11 and 12, up to 10. */
  dingdongTestResult?: DoorbellDingdingtestResult[];
};

/**
 * Codec for `<doorbellDingdingtest>`.
 *
 * @example Read a radio test reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { doorbellDingdingtest } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<doorbellDingdingtest version="1.1"><freq>868</freq><curFreq>869</curFreq>' +
 *     "<sub1gTestResult>1</sub1gTestResult></doorbellDingdingtest>",
 * ).root;
 *
 * assertEquals(doorbellDingdingtest.decode(root), {
 *   freq: 868,
 *   curFreq: 869,
 *   sub1gTestResult: 1,
 * });
 * ```
 */
export const doorbellDingdingtest: XmlParam<
  "doorbellDingdingtest",
  DoorbellDingdingtest
> = xmlParam("doorbellDingdingtest", {
  freq: optional(int()),
  curFreq: optional(int()),
  sub1gTestResult: optional(int()),
  update: optional(repeated(obj({
    result: int(),
    curVer: text(),
    reqVer: text(),
  }))),
  dingdongTestResult: optional(repeated(obj({
    state: int(),
    verifyResult: int(),
    agingResult: int(),
  }))),
});
