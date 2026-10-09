/**
 * `<answerEvent>`: tells the Video Doorbell PoE that a visitor call was
 * answered. Set with cmd 620 (`SET_ANSWER_EVENT`).
 *
 * Firmware: `net_param_answer_event_x2s` reads `startTime` when present.
 * There is no serializer: the element only appears in requests. The unit
 * of `startTime` is not established.
 *
 * @example Read a cmd 620 request
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { answerEvent } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   "<answerEvent><startTime>1700000000</startTime></answerEvent>",
 * ).root;
 *
 * assertEquals(answerEvent.decode(root), { startTime: 1700000000 });
 * ```
 *
 * @module
 */

import { int, optional, type XmlParam, xmlParam } from "../xml.ts";

/** The answered call in `<answerEvent>`. */
export type AnswerEvent = {
  /**
   * When the call was answered. Parsed as a 64-bit integer but stored in
   * 32 bits, so only the low 32 bits reach the device.
   */
  startTime?: number;
};

/**
 * Codec for `<answerEvent>`.
 *
 * @example Build a cmd 620 request
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { answerEvent } from "@hertzg/reolink-api/protocol/params";
 *
 * assertEquals(
 *   answerEvent.encode({ startTime: 1760000000 }),
 *   '<answerEvent version="1.1"><startTime>1760000000</startTime></answerEvent>',
 * );
 * ```
 */
export const answerEvent: XmlParam<"answerEvent", AnswerEvent> = xmlParam(
  "answerEvent",
  { startTime: optional(int()) },
);
