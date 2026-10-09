/**
 * `<sleepState>`: the privacy (sleep) state. Read with cmd 574
 * (`GET_SLEEP_STATE`) and set with cmd 575 (`SET_SLEEP_STATE`) on the Video
 * Doorbell PoE. The device announces changes as `<sleepStatus>` in cmd 623.
 *
 * Firmware: `net_param_sleep_state_x2s` reads whichever field is present.
 * `net_param_sleep_state_s2x` writes only `sleep`, always. The cmd 575
 * handler needs an admin session and `operate` 2, and uses only `sleep`;
 * `mode`, `panPos`, `tiltPos` and `imageName` are parsed but unused on the
 * doorbell.
 *
 * @example Read a cmd 574 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { sleepState } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse('<sleepState version="1.1"><sleep>0</sleep></sleepState>')
 *   .root;
 *
 * assertEquals(sleepState.decode(root), { sleep: 0 });
 * ```
 *
 * @module
 */

import { int, optional, text, type XmlParam, xmlParam } from "../xml.ts";

/** The privacy state in `<sleepState>`. */
export type SleepState = {
  /** Request only: the operation; cmd 575 succeeds only with 2. */
  operate?: number;
  /**
   * The stored sleep word. 1 makes the doorbell refuse live view (cmd 3)
   * and snapshots (cmd 109); 0 is the ordinary state.
   */
  sleep?: number;
  /** Request only: parsed but unused on the doorbell. */
  mode?: number;
  /** Request only: pan position; parsed but unused on the doorbell. */
  panPos?: number;
  /** Request only: tilt position; parsed but unused on the doorbell. */
  tiltPos?: number;
  /** Request only: an image name up to 32 bytes; parsed but unused on the doorbell. */
  imageName?: string;
};

/**
 * Codec for `<sleepState>`.
 *
 * @example Build a cmd 575 request that turns privacy mode on
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { sleepState } from "@hertzg/reolink-api/protocol/params";
 *
 * assertEquals(
 *   sleepState.encode({ operate: 2, sleep: 1 }),
 *   '<sleepState version="1.1"><operate>2</operate><sleep>1</sleep></sleepState>',
 * );
 * ```
 */
export const sleepState: XmlParam<"sleepState", SleepState> = xmlParam(
  "sleepState",
  {
    operate: optional(int()),
    sleep: optional(int()),
    mode: optional(int()),
    panPos: optional(int()),
    tiltPos: optional(int()),
    imageName: optional(text()),
  },
);
