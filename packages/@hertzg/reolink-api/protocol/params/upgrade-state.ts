/**
 * `<upgradeState>`: progress of an online firmware update. Read with
 * cmd 227.
 *
 * Firmware: `net_online_update_state_s2x` writes every field, always.
 * `net_online_update_state_x2s` reads whichever fields are present, so
 * every field is optional.
 *
 * The two directions name the states differently. The writer maps its
 * state number to `stopped`, `downloading`, `timeout`, `finish` or
 * `imgerror`, and anything else to `none`. The reader accepts
 * `downloading`, `updating`, `stopped`, `timeout`, `finish` and `imgerror`,
 * and rejects anything else, including `none`.
 *
 * @example Read a cmd 227 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { upgradeState } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<upgradeState version="1.1"><downloadSize>1048576</downloadSize>' +
 *     "<packetSize>16777216</packetSize><state>downloading</state></upgradeState>",
 * ).root;
 *
 * assertEquals(upgradeState.decode(root).state, "downloading");
 * ```
 *
 * @module
 */

import { int, oneOf, optional, type XmlParam, xmlParam } from "../xml.ts";

/** The online update progress in `<upgradeState>`. */
export type UpgradeState = {
  /** Bytes downloaded so far. */
  downloadSize?: number;
  /** Size of the firmware package in bytes. */
  packetSize?: number;
  /** Update state; `none` is written only, `updating` is read only. */
  state?:
    | "none"
    | "stopped"
    | "downloading"
    | "updating"
    | "timeout"
    | "finish"
    | "imgerror";
};

/**
 * Codec for `<upgradeState>`.
 *
 * @example Build a `<upgradeState>` element
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { upgradeState } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = upgradeState.encode({
 *   downloadSize: 16777216,
 *   packetSize: 16777216,
 *   state: "finish",
 * });
 *
 * assertStringIncludes(xml, "<state>finish</state>");
 * ```
 */
export const upgradeState: XmlParam<"upgradeState", UpgradeState> = xmlParam(
  "upgradeState",
  {
    downloadSize: optional(int()),
    packetSize: optional(int()),
    state: optional(
      oneOf(
        "none",
        "stopped",
        "downloading",
        "updating",
        "timeout",
        "finish",
        "imgerror",
      ),
    ),
  },
);
