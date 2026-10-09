/**
 * `<afAlgorithm>`: the autofocus algorithm for a channel (cmd 453 reads it,
 * cmd 454 sets it).
 *
 * Firmware: `net_af_algorithm_s2x` writes both fields, always.
 * `net_af_algorithm_x2s` reads whichever fields are present and skips the
 * rest, so each one may be missing from a request.
 *
 * @example Read the cmd 453 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { afAlgorithm } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<afAlgorithm version="1.1"><channelId>0</channelId>' +
 *     "<algorithm>1</algorithm></afAlgorithm>",
 * ).root;
 *
 * assertEquals(afAlgorithm.decode(root), { channelId: 0, algorithm: 1 });
 * ```
 *
 * @module
 */

import { int, optional, type XmlParam, xmlParam } from "../xml.ts";

/** The autofocus algorithm setting in `<afAlgorithm>`. */
export type AfAlgorithm = {
  /** Zero-based channel. */
  channelId?: number;
  /** Algorithm as a number; the firmware does not name the values. */
  algorithm?: number;
};

/**
 * Codec for `<afAlgorithm>`.
 *
 * @example Choose an algorithm
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { afAlgorithm } from "@hertzg/reolink-api/protocol/params";
 *
 * assertEquals(
 *   afAlgorithm.encode({ channelId: 0, algorithm: 2 }),
 *   '<afAlgorithm version="1.1"><channelId>0</channelId><algorithm>2</algorithm></afAlgorithm>',
 * );
 * ```
 */
export const afAlgorithm: XmlParam<"afAlgorithm", AfAlgorithm> = xmlParam(
  "afAlgorithm",
  {
    channelId: optional(int()),
    algorithm: optional(int()),
  },
);
