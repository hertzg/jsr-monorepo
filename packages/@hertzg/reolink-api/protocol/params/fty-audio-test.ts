/**
 * `<ftyAudioTest>`: the factory audio test parameters. A factory element
 * that no registered command carries.
 *
 * Firmware: `net_fty_audio_para_x2s` reads each field when present and
 * skips a missing one. `net_fty_audio_para_s2x` is an empty stub, so the
 * camera never writes this element.
 *
 * @example Build an `<ftyAudioTest>` request
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { ftyAudioTest } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = ftyAudioTest.encode({ ratedPower: 80, flitFreq: 1000 });
 *
 * assertStringIncludes(xml, "<flitFreq>1000</flitFreq>");
 * ```
 *
 * @module
 */

import { int, optional, type XmlParam, xmlParam } from "../xml.ts";

/** The factory audio test parameters in `<ftyAudioTest>`. */
export type FtyAudioTest = {
  /** Rated power. */
  ratedPower?: number;
  /** Power difference. */
  difPower?: number;
  /** Frequency (Hz) difference. */
  difHz?: number;
  /** Zero-crossing difference. */
  difZero?: number;
  /** Crest difference. */
  difCrest?: number;
  /** Sameness difference. */
  difSame?: number;
  /** Frequency difference. */
  difFreq?: number;
  /** Filter frequency; the firmware spells the element `flitFreq`. */
  flitFreq?: number;
};

/**
 * Codec for `<ftyAudioTest>`.
 *
 * @example Read an `<ftyAudioTest>` element
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { ftyAudioTest } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<ftyAudioTest version="1.1"><ratedPower>80</ratedPower>' +
 *     "<difPower>5</difPower></ftyAudioTest>",
 * ).root;
 *
 * assertEquals(ftyAudioTest.decode(root), { ratedPower: 80, difPower: 5 });
 * ```
 */
export const ftyAudioTest: XmlParam<"ftyAudioTest", FtyAudioTest> = xmlParam(
  "ftyAudioTest",
  {
    ratedPower: optional(int()),
    difPower: optional(int()),
    difHz: optional(int()),
    difZero: optional(int()),
    difCrest: optional(int()),
    difSame: optional(int()),
    difFreq: optional(int()),
    flitFreq: optional(int()),
  },
);
