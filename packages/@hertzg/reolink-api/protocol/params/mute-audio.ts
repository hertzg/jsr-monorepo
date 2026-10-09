/**
 * `<muteAudio>`: a request to mute or unmute the alarm sound, sent with
 * cmd 266.
 *
 * Firmware: `nets_param_mute_audio_x2s` reads whichever fields are
 * present, so both are optional. No firmware code writes this element, so
 * field order follows the reader.
 *
 * @example Build a cmd 266 request
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { muteAudio } from "@hertzg/reolink-api/protocol/params";
 *
 * assertEquals(
 *   muteAudio.encode({ channelId: 0, mute: 1 }),
 *   '<muteAudio version="1.1"><channelId>0</channelId><mute>1</mute></muteAudio>',
 * );
 * ```
 *
 * @module
 */

import { int, optional, type XmlParam, xmlParam } from "../xml.ts";

/** The mute request in `<muteAudio>`. */
export type MuteAudio = {
  /** Zero-based channel. */
  channelId?: number;
  /** Mute switch, as a number. */
  mute?: number;
};

/**
 * Codec for `<muteAudio>`.
 *
 * @example Read a `<muteAudio>` element
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { muteAudio } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<muteAudio version="1.1"><channelId>0</channelId><mute>0</mute></muteAudio>',
 * ).root;
 *
 * assertEquals(muteAudio.decode(root), { channelId: 0, mute: 0 });
 * ```
 */
export const muteAudio: XmlParam<"muteAudio", MuteAudio> = xmlParam(
  "muteAudio",
  {
    channelId: optional(int()),
    mute: optional(int()),
  },
);
