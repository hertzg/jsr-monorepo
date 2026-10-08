/**
 * Siren requests (cmd 263).
 *
 * The siren plays in one of two modes:
 *
 * ```
 * times   playMode 0  plays the alarm sound N times, about 5 s each
 * manual  playMode 2  onOff 1 plays until a request with onOff 0
 * ```
 *
 * The camera acknowledges with an empty status-200 reply.
 *
 * @example Build a request that plays the siren twice
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { sirenXml } from "@hertzg/reolink-api/protocol/siren";
 *
 * const xml = sirenXml({ channel: 0, times: 2 });
 *
 * assertStringIncludes(xml, "<playMode>0</playMode>");
 * assertStringIncludes(xml, "<playTimes>2</playTimes>");
 * ```
 *
 * @module
 */

/**
 * What {@link sirenXml} asks the siren to do: play a number of `times`, or
 * turn manual play `on` or off.
 */
export type SirenRequest =
  & {
    /**
     * The zero-based channel number. Leave it out to address the device
     * itself, such as a hub's siren.
     */
    channel?: number;
  }
  & ({ times: number; on?: never } | { on: boolean; times?: never });

/**
 * Builds the body of a siren request.
 *
 * @param request The channel and what to play.
 * @returns The request XML, ready to be encrypted.
 *
 * @example Start and stop manual play
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { sirenXml } from "@hertzg/reolink-api/protocol/siren";
 *
 * assertStringIncludes(sirenXml({ channel: 0, on: true }), "<onOff>1</onOff>");
 * assertStringIncludes(sirenXml({ channel: 0, on: false }), "<onOff>0</onOff>");
 * ```
 */
export function sirenXml(request: SirenRequest): string {
  const { channel, times, on } = request;
  return '<?xml version="1.0" encoding="UTF-8" ?>\n' +
    "<body>\n" +
    '<audioPlayInfo version="1.1">\n' +
    (channel === undefined ? "" : `<channelId>${channel}</channelId>\n`) +
    `<playMode>${times === undefined ? 2 : 0}</playMode>\n` +
    "<playDuration>10</playDuration>\n" +
    `<playTimes>${times ?? 1}</playTimes>\n` +
    `<onOff>${on === false ? 0 : 1}</onOff>\n` +
    "</audioPlayInfo>\n" +
    "</body>\n";
}
