/**
 * `<HeartBeat>`: the keep-alive sent with cmd 0, carrying a wall-clock
 * timestamp split into seconds and microseconds.
 *
 * Firmware: the netserver heartbeat reply writes `size` (always 12), `sec`
 * and `usec`, always. `nets_param_heart_beat_x2s` rejects the element unless
 * both `sec` and `usec` are present and non-negative; `size` it reads but
 * does not require.
 *
 * @example Read a heartbeat
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { heartBeat } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<HeartBeat version="1.1"><size>12</size><sec>1700000000</sec>' +
 *     "<usec>250000</usec></HeartBeat>",
 * ).root;
 *
 * assertEquals(heartBeat.decode(root).sec, 1700000000);
 * ```
 *
 * @module
 */

import { int, optional, type XmlParam, xmlParam } from "../xml.ts";

/** The keep-alive timestamp in `<HeartBeat>`. */
export type HeartBeat = {
  /** Byte size of the timestamp; the camera writes 12. */
  size?: number;
  /** Whole seconds of the timestamp; must not be negative. */
  sec: number;
  /** Microseconds past `sec`; must not be negative. */
  usec: number;
};

/**
 * Codec for `<HeartBeat>`.
 *
 * @example Build a `<HeartBeat>` element
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { heartBeat } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = heartBeat.encode({ sec: 1700000000, usec: 500 });
 *
 * assertStringIncludes(xml, "<usec>500</usec>");
 * ```
 */
export const heartBeat: XmlParam<"HeartBeat", HeartBeat> = xmlParam(
  "HeartBeat",
  {
    size: optional(int()),
    sec: int(),
    usec: int(),
  },
);
