/**
 * `<AbilitySuppport>` (sic, three p's): which permission groups one user
 * has. The camera replies with it to cmd 58 (`GET_USERCFG_V20`), next to
 * `<UserList>`.
 *
 * Firmware: `nets_ability_support_s2x` writes every field, always. The
 * parser `nets_ability_support_x2s` reads whichever fields are present, so
 * none is required.
 *
 * @example Read a cmd 58 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { abilitySuppport } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<AbilitySuppport version="1.1"><userName>admin</userName>' +
 *     "<system>1</system><streaming>1</streaming><PTZ>1</PTZ>" +
 *     "</AbilitySuppport>",
 * ).root;
 *
 * assertEquals(abilitySuppport.decode(root).PTZ, 1);
 * ```
 *
 * @module
 */

import { int, optional, text, type XmlParam, xmlParam } from "../xml.ts";

/** One user's permission groups in `<AbilitySuppport>`; each flag is 0 or 1. */
export type AbilitySuppport = {
  /** The user, up to 31 bytes. */
  userName?: string;
  /** System settings. */
  system?: number;
  /** Live streaming. */
  streaming?: number;
  /** Recording. */
  record?: number;
  /** Network settings. */
  network?: number;
  /** Pan, tilt and zoom. */
  PTZ?: number;
  /** Alarm inputs and outputs. */
  IO?: number;
  /** Alarms. */
  alarm?: number;
  /** Image settings. */
  image?: number;
  /** Video settings. */
  video?: number;
  /** Audio. */
  audio?: number;
  /** Security settings. */
  security?: number;
  /** Playback. */
  replay?: number;
  /** Storage. */
  disk?: number;
};

/**
 * Codec for `<AbilitySuppport>`.
 *
 * @example Build an `<AbilitySuppport>` element
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { abilitySuppport } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = abilitySuppport.encode({ userName: "guest", replay: 0 });
 *
 * assertStringIncludes(xml, "<replay>0</replay>");
 * ```
 */
export const abilitySuppport: XmlParam<"AbilitySuppport", AbilitySuppport> =
  xmlParam("AbilitySuppport", {
    userName: optional(text()),
    system: optional(int()),
    streaming: optional(int()),
    record: optional(int()),
    network: optional(int()),
    PTZ: optional(int()),
    IO: optional(int()),
    alarm: optional(int()),
    image: optional(int()),
    video: optional(int()),
    audio: optional(int()),
    security: optional(int()),
    replay: optional(int()),
    disk: optional(int()),
  });
