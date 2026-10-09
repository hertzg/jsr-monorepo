/**
 * `<PtzGuard>`: the PTZ guard (home) position, which the camera returns to
 * after a timeout (cmd 331 sets it, cmd 332 reads it).
 *
 * Firmware: `nets_param_guard_s2x` writes `channelId`, `timeout`, `benable`,
 * `bvalid` and `imageName`, always. `nets_param_guard_x2s` reads
 * `channelId`, `benable`, `timeout`, `needSetPos`, `command` and
 * `imageName` when present and skips the rest, so each field may be
 * missing.
 *
 * @example Read the cmd 332 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { ptzGuard } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<PtzGuard version="1.1"><channelId>0</channelId><timeout>60</timeout>' +
 *     "<benable>1</benable><bvalid>1</bvalid><imageName>guard.jpg</imageName>" +
 *     "</PtzGuard>",
 * ).root;
 *
 * assertEquals(ptzGuard.decode(root).timeout, 60);
 * ```
 *
 * @module
 */

import { int, optional, text, type XmlParam, xmlParam } from "../xml.ts";

/** The PTZ guard position settings in `<PtzGuard>`. */
export type PtzGuard = {
  /** Zero-based channel; the parser rejects 64 and above. */
  channelId?: number;
  /** Seconds idle before the camera returns to the guard position. */
  timeout?: number;
  /** Nonzero when returning to the guard position is on. */
  benable?: number;
  /** Nonzero when a guard position is stored; written in replies only. */
  bvalid?: number;
  /** Name of the guard position preview image, up to 31 characters. */
  imageName?: string;
  /** Nonzero to store the current position as the guard position; read from requests only. */
  needSetPos?: number;
  /**
   * PTZ command name, such as `setGrd` or `toGrd`; the parser rejects a name
   * outside the firmware's 37 PTZ commands. Read from requests only.
   */
  command?: string;
};

/**
 * Codec for `<PtzGuard>`.
 *
 * @example Store the current position as the guard position
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { ptzGuard } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = ptzGuard.encode({
 *   channelId: 0,
 *   timeout: 120,
 *   benable: 1,
 *   needSetPos: 1,
 * });
 *
 * assertStringIncludes(xml, "<needSetPos>1</needSetPos>");
 * ```
 */
export const ptzGuard: XmlParam<"PtzGuard", PtzGuard> = xmlParam("PtzGuard", {
  channelId: optional(int()),
  timeout: optional(int()),
  benable: optional(int()),
  bvalid: optional(int()),
  imageName: optional(text()),
  needSetPos: optional(int()),
  command: optional(text()),
});
