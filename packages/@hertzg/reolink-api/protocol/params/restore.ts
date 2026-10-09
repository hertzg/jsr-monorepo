/**
 * `<Restore>`: which settings groups to reset to factory defaults, sent with
 * cmd 99 (`SET_RESTORE_V20`).
 *
 * Firmware: `nets_param_restore_cfg_x2s` reads whichever flags are present,
 * each as a boolean. There is no serializer: the camera never writes this
 * element.
 *
 * @example Read a `<Restore>` request
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { restore } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse('<Restore version="1.1"><network>1</network></Restore>').root;
 *
 * assertEquals(restore.decode(root), { network: 1 });
 * ```
 *
 * @module
 */

import { int, optional, type XmlParam, xmlParam } from "../xml.ts";

/** The settings groups to reset in `<Restore>`; 1 resets, 0 keeps. */
export type Restore = {
  /** Every group. */
  all?: number;
  /** Display settings. */
  display?: number;
  /** Recording settings. */
  recording?: number;
  /** Network settings. */
  network?: number;
  /** Alarm settings. */
  alarm?: number;
  /** Device settings. */
  device?: number;
  /** System settings. */
  system?: number;
  /** Wi-Fi settings. */
  wifi?: number;
  /** IP camera channel settings. */
  IPC?: number;
};

/**
 * Codec for `<Restore>`.
 *
 * @example Reset only the alarm and recording settings
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { restore } from "@hertzg/reolink-api/protocol/params";
 *
 * assertEquals(
 *   restore.encode({ recording: 1, alarm: 1 }),
 *   '<Restore version="1.1"><recording>1</recording><alarm>1</alarm></Restore>',
 * );
 * ```
 */
export const restore: XmlParam<"Restore", Restore> = xmlParam("Restore", {
  all: optional(int()),
  display: optional(int()),
  recording: optional(int()),
  network: optional(int()),
  alarm: optional(int()),
  device: optional(int()),
  system: optional(int()),
  wifi: optional(int()),
  IPC: optional(int()),
});
