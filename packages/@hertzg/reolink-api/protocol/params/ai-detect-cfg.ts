/**
 * `<AiDetectCfg>`: AI detection settings for one target type on one channel
 * (cmd 342 reads them, cmd 343 sets them, cmd 344 reads the defaults).
 *
 * Firmware: `net_ai_area_detect_s2x` writes every field, always, except
 * `area`, which it leaves out when the grid fails to encode.
 * `net_ai_area_detect_x2s` reads whichever fields are present and skips the
 * rest, so each one may be missing. When a request carries `width`, the
 * parser also needs `height` and `area`: width 1..155, height 1..100, and an
 * `area` that decodes to that many cells.
 *
 * @example Read the cmd 342 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { aiDetectCfg } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<AiDetectCfg version="1.1"><chn>0</chn><type>people</type>' +
 *     "<sensitivity>50</sensitivity><stayTime>0</stayTime>" +
 *     "<minTargetHeight>0</minTargetHeight><minTargetWidth>0</minTargetWidth>" +
 *     "<maxTargetHeight>1</maxTargetHeight><maxTargetWidth>1</maxTargetWidth>" +
 *     "<width>4</width><height>2</height><area>AQEBAQEBAQE=</area></AiDetectCfg>",
 * ).root;
 *
 * assertEquals(aiDetectCfg.decode(root).type, "people");
 * ```
 *
 * @module
 */

import {
  float,
  int,
  oneOf,
  optional,
  text,
  type XmlParam,
  xmlParam,
} from "../xml.ts";

/** AI detection settings for one target type, in `<AiDetectCfg>`. */
export type AiDetectCfg = {
  /** Zero-based channel. */
  chn?: number;
  /** The target type these settings apply to. */
  type?: "people" | "vehicle" | "face" | "dog_cat" | "other";
  /** Detection sensitivity. */
  sensitivity?: number;
  /** How long a target must stay before it triggers. */
  stayTime?: number;
  /** Smallest target height, as a fraction of the frame. */
  minTargetHeight?: number;
  /** Smallest target width, as a fraction of the frame. */
  minTargetWidth?: number;
  /** Largest target height, as a fraction of the frame. */
  maxTargetHeight?: number;
  /** Largest target width, as a fraction of the frame. */
  maxTargetWidth?: number;
  /** Detection grid columns, 1..155. */
  width?: number;
  /** Detection grid rows, 1..100. */
  height?: number;
  /** Detection grid as base64, one byte per cell, row by row. */
  area?: string;
};

/**
 * Codec for `<AiDetectCfg>`.
 *
 * @example Set vehicle detection over a 2 by 1 grid
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { aiDetectCfg } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = aiDetectCfg.encode({
 *   chn: 0,
 *   type: "vehicle",
 *   sensitivity: 70,
 *   width: 2,
 *   height: 1,
 *   area: "AQE=",
 * });
 *
 * assertStringIncludes(xml, "<type>vehicle</type>");
 * ```
 */
export const aiDetectCfg: XmlParam<"AiDetectCfg", AiDetectCfg> = xmlParam(
  "AiDetectCfg",
  {
    chn: optional(int()),
    type: optional(oneOf("people", "vehicle", "face", "dog_cat", "other")),
    sensitivity: optional(int()),
    stayTime: optional(int()),
    minTargetHeight: optional(float()),
    minTargetWidth: optional(float()),
    maxTargetHeight: optional(float()),
    maxTargetWidth: optional(float()),
    width: optional(int()),
    height: optional(int()),
    area: optional(text()),
  },
);
