/**
 * `<Snap>`: a still snapshot, requested and answered with cmd 109
 * (`SNAP_V20`). The reply's `pictureSize` is the JPEG byte count that
 * follows as binary data.
 *
 * Firmware: the cmd 109 handler in `netserver` writes `channelId`,
 * `fileName`, `time` and `pictureSize` always. `nets_param_snap_x2s` reads
 * whichever field is present, including `snapPolicy`, which the reply never
 * carries, and rejects a negative `channelId`.
 *
 * @example Read a cmd 109 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { snap } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<Snap version="1.1"><channelId>0</channelId><fileName>snap.jpg</fileName>' +
 *     "<time>0</time><pictureSize>48213</pictureSize></Snap>",
 * ).root;
 *
 * assertEquals(snap.decode(root).pictureSize, 48213);
 * ```
 *
 * @module
 */

import { int, optional, text, type XmlParam, xmlParam } from "../xml.ts";

/** The snapshot request or reply in `<Snap>`. */
export type Snap = {
  /** Zero-based channel. */
  channelId?: number;
  /** Snapshot file name, up to 127 characters. */
  fileName?: string;
  /** Snapshot time value; its unit is not visible in the firmware. */
  time?: number;
  /** JPEG size in bytes. */
  pictureSize?: number;
  /** Snapshot policy; request only. */
  snapPolicy?: number;
};

/**
 * Codec for `<Snap>`.
 *
 * @example Request a snapshot of channel 0
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { snap } from "@hertzg/reolink-api/protocol/params";
 *
 * assertEquals(
 *   snap.encode({ channelId: 0, time: 0 }),
 *   '<Snap version="1.1"><channelId>0</channelId><time>0</time></Snap>',
 * );
 * ```
 */
export const snap: XmlParam<"Snap", Snap> = xmlParam("Snap", {
  channelId: optional(int()),
  fileName: optional(text()),
  time: optional(int()),
  pictureSize: optional(int()),
  snapPolicy: optional(int()),
});
