/**
 * `<trackLimit>`: the left and right pan limits for AI tracking (cmd 434
 * reads them, cmd 435 sets them).
 *
 * Firmware: `nets_param_ai_track_limit_s2x` writes every field, always.
 * `nets_param_ai_track_limit_x2s` reads whichever fields are present and
 * skips the rest, so each one may be missing from a request.
 *
 * @example Read the cmd 434 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { trackLimit } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<trackLimit version="1.1"><channelId>0</channelId><leftLimit>100</leftLimit>' +
 *     "<leftImageName>left.jpg</leftImageName><rightLimit>2600</rightLimit>" +
 *     "<rightImageName>right.jpg</rightImageName></trackLimit>",
 * ).root;
 *
 * assertEquals(trackLimit.decode(root).rightLimit, 2600);
 * ```
 *
 * @module
 */

import { int, optional, text, type XmlParam, xmlParam } from "../xml.ts";

/** The AI tracking pan limits in `<trackLimit>`. */
export type TrackLimit = {
  /** Zero-based channel. */
  channelId?: number;
  /** Left limit position; units are not established. */
  leftLimit?: number;
  /** Name of the preview image at the left limit, up to 31 characters. */
  leftImageName?: string;
  /** Right limit position; units are not established. */
  rightLimit?: number;
  /** Name of the preview image at the right limit, up to 31 characters. */
  rightImageName?: string;
};

/**
 * Codec for `<trackLimit>`.
 *
 * @example Set the tracking limits
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { trackLimit } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = trackLimit.encode({ channelId: 0, leftLimit: 0, rightLimit: 1800 });
 *
 * assertStringIncludes(xml, "<rightLimit>1800</rightLimit>");
 * ```
 */
export const trackLimit: XmlParam<"trackLimit", TrackLimit> = xmlParam(
  "trackLimit",
  {
    channelId: optional(int()),
    leftLimit: optional(int()),
    leftImageName: optional(text()),
    rightLimit: optional(int()),
    rightImageName: optional(text()),
  },
);
