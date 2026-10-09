/**
 * `<FloodlightStatusList>`: which floodlights are on. The camera pushes it
 * unasked as cmd 291 when a floodlight changes.
 *
 * Firmware: the cmd 291 report builder (`nets_floodlight_report`) writes
 * one `<FloodlightStatus>` per channel that has a floodlight, directly
 * under `<FloodlightStatusList>`, each with `channel` and `status`, always.
 * Nothing parses it, so the item fields are required.
 *
 * @example Read the cmd 291 push
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { floodlightStatusList } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<FloodlightStatusList version="1.1"><FloodlightStatus><channel>0</channel>' +
 *     "<status>1</status></FloodlightStatus></FloodlightStatusList>",
 * ).root;
 *
 * assertEquals(floodlightStatusList.decode(root).FloodlightStatus, [
 *   { channel: 0, status: 1 },
 * ]);
 * ```
 *
 * @module
 */

import { int, obj, repeated, type XmlParam, xmlParam } from "../xml.ts";

/** One floodlight in `<FloodlightStatusList>`. */
export type FloodlightStatus = {
  /** Zero-based channel. */
  channel: number;
  /** Floodlight state as a number. */
  status: number;
};

/** The floodlight states in `<FloodlightStatusList>`. */
export type FloodlightStatusList = {
  /** One entry per floodlight, as repeated `<FloodlightStatus>` elements. */
  FloodlightStatus: FloodlightStatus[];
};

/**
 * Codec for `<FloodlightStatusList>`.
 *
 * @example Build a `<FloodlightStatusList>` element
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { floodlightStatusList } from "@hertzg/reolink-api/protocol/params";
 *
 * assertEquals(
 *   floodlightStatusList.encode({
 *     FloodlightStatus: [{ channel: 0, status: 0 }],
 *   }),
 *   '<FloodlightStatusList version="1.1"><FloodlightStatus><channel>0</channel>' +
 *     "<status>0</status></FloodlightStatus></FloodlightStatusList>",
 * );
 * ```
 */
export const floodlightStatusList: XmlParam<
  "FloodlightStatusList",
  FloodlightStatusList
> = xmlParam("FloodlightStatusList", {
  FloodlightStatus: repeated(obj({ channel: int(), status: int() })),
});
