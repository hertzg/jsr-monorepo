/**
 * `<AutoReply>`: the doorbell's automatic voice reply to visitors. Read with
 * cmd 427, written with cmd 428.
 *
 * Firmware (Video Doorbell PoE): `net_param_auto_reply_x2s` reads each
 * field when present and skips the rest. `net_param_auto_reply_s2x` always
 * writes `enable`, `timeout`, `audioId`, `fesEnable`, `fesAudioId`, both
 * times and `current`, and writes `extId`, `fileName`, `fesExtId` and
 * `fesFileName` only when they are not empty. `current` is written but
 * never read. Since the parser requires nothing, every field is optional.
 * What the `fes` fields and the schedule mean is not established.
 *
 * @example Read a cmd 427 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { autoReply } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<AutoReply version="1.1"><enable>1</enable><timeout>10</timeout>' +
 *     "<audioId>1</audioId><fesEnable>0</fesEnable><fesAudioId>1</fesAudioId>" +
 *     "<startTime><year>2026</year><month>1</month><day>1</day><hour>0</hour>" +
 *     "<min>0</min><sec>0</sec></startTime><endTime><year>2026</year>" +
 *     "<month>1</month><day>2</day><hour>0</hour><min>0</min><sec>0</sec>" +
 *     "</endTime><current>0</current></AutoReply>",
 * ).root;
 *
 * assertEquals(autoReply.decode(root).endTime?.day, 2);
 * ```
 *
 * @module
 */

import { int, obj, optional, text, type XmlParam, xmlParam } from "../xml.ts";

/** A date and time in `<AutoReply>`. */
export type AutoReplyTime = {
  /** Year, such as 2026. */
  year?: number;
  /** Month. */
  month?: number;
  /** Day of the month. */
  day?: number;
  /** Hour. */
  hour?: number;
  /** Minute. */
  min?: number;
  /** Second. */
  sec?: number;
};

/** The automatic reply settings in `<AutoReply>`. */
export type AutoReply = {
  /** 1 when the automatic reply is on. */
  enable?: number;
  /** Reply timeout. The unit is not established. */
  timeout?: number;
  /** Id of the reply audio file. */
  audioId?: number;
  /** External id of the reply audio file; not written when empty. */
  extId?: string;
  /** Name of the reply audio file; not written when empty. */
  fileName?: string;
  /** 1 when the `fes` reply is on. */
  fesEnable?: number;
  /** Id of the `fes` reply audio file. */
  fesAudioId?: number;
  /** External id of the `fes` audio file; not written when empty. */
  fesExtId?: string;
  /** Name of the `fes` audio file; not written when empty. */
  fesFileName?: string;
  /** Start of the reply schedule. */
  startTime?: AutoReplyTime;
  /** End of the reply schedule. */
  endTime?: AutoReplyTime;
  /** Reply only; the firmware writes it but never reads it. Its values are not established. */
  current?: number;
};

function time() {
  return obj({
    year: optional(int()),
    month: optional(int()),
    day: optional(int()),
    hour: optional(int()),
    min: optional(int()),
    sec: optional(int()),
  });
}

/**
 * Codec for `<AutoReply>`.
 *
 * @example Build a cmd 428 request
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { autoReply } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = autoReply.encode({
 *   enable: 1,
 *   timeout: 10,
 *   audioId: 2,
 *   fileName: "busy.wav",
 * });
 *
 * assertStringIncludes(xml, "<fileName>busy.wav</fileName>");
 * ```
 */
export const autoReply: XmlParam<"AutoReply", AutoReply> = xmlParam(
  "AutoReply",
  {
    enable: optional(int()),
    timeout: optional(int()),
    audioId: optional(int()),
    extId: optional(text()),
    fileName: optional(text()),
    fesEnable: optional(int()),
    fesAudioId: optional(int()),
    fesExtId: optional(text()),
    fesFileName: optional(text()),
    startTime: optional(time()),
    endTime: optional(time()),
    current: optional(int()),
  },
);
