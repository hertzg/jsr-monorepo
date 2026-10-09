/**
 * `<sleepStatus>`: the privacy (sleep) state the Video Doorbell PoE pushes
 * unasked as cmd 623 whenever it changes. It is a different element from
 * `<sleepState>`, which cmds 574/575 read and write.
 *
 * Firmware: `nets_sleep_report` in netserver writes `sleep` always and
 * sends it to every logged-in session. No library parser exists.
 *
 * @example Read the cmd 623 push
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { sleepStatus } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<sleepStatus version="1.1"><sleep>1</sleep></sleepStatus>',
 * ).root;
 *
 * assertEquals(sleepStatus.decode(root), { sleep: 1 });
 * ```
 *
 * @module
 */

import { int, type XmlParam, xmlParam } from "../xml.ts";

/** The pushed privacy state in `<sleepStatus>`. */
export type SleepStatus = {
  /**
   * The stored sleep word. 1 makes the doorbell refuse live view (cmd 3)
   * and snapshots (cmd 109); 0 is the ordinary state.
   */
  sleep: number;
};

/**
 * Codec for `<sleepStatus>`.
 *
 * @example Build a `<sleepStatus>` element
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { sleepStatus } from "@hertzg/reolink-api/protocol/params";
 *
 * assertEquals(
 *   sleepStatus.encode({ sleep: 0 }),
 *   '<sleepStatus version="1.1"><sleep>0</sleep></sleepStatus>',
 * );
 * ```
 */
export const sleepStatus: XmlParam<"sleepStatus", SleepStatus> = xmlParam(
  "sleepStatus",
  { sleep: int() },
);
