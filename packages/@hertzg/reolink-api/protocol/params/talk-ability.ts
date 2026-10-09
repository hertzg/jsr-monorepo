/**
 * `<TalkAbility>`: the two-way audio modes the camera supports, the reply
 * to cmd 10.
 *
 * Firmware: `nets_talk_ability_s2x` always writes `duplexList` and
 * `audioStreamModeList`, and writes `audioConfigList` only when at least one
 * audio config is set. Every written `<audioConfig>` carries all six fields.
 *
 * @example Read a talk ability reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { talkAbility } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<TalkAbility version="1.1"><duplexList><duplex>FDX</duplex></duplexList>' +
 *     "<audioStreamModeList><audioStreamMode>followVideoStream</audioStreamMode>" +
 *     "</audioStreamModeList></TalkAbility>",
 * ).root;
 *
 * assertEquals(talkAbility.decode(root).duplexList, ["FDX"]);
 * ```
 *
 * @module
 */

import {
  int,
  list,
  obj,
  oneOf,
  optional,
  type XmlParam,
  xmlParam,
} from "../xml.ts";

/** The two-way audio abilities in `<TalkAbility>`. */
export type TalkAbility = {
  /** Supported duplex modes: full (`FDX`) or half (`HDX`); up to eight. */
  duplexList: ("FDX" | "HDX")[];
  /** Supported audio stream modes; up to eight. */
  audioStreamModeList: ("followVideoStream" | "onlyAudioStream")[];
  /** Supported audio encodings; absent when none is set. */
  audioConfigList?: {
    /** Slot index, 0 to 31. */
    priority: number;
    /** Codec. */
    audioType: "adpcm" | "g711";
    /** Sample rate in Hz. */
    sampleRate: number;
    /** Bits per sample. */
    samplePrecision: number;
    /** Bytes per encoder frame. */
    lengthPerEncoder: number;
    /** Channel layout. */
    soundTrack: "mono" | "stereo";
  }[];
};

/**
 * Codec for `<TalkAbility>`.
 *
 * @example Build a `<TalkAbility>` element
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { talkAbility } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = talkAbility.encode({
 *   duplexList: ["HDX"],
 *   audioStreamModeList: ["onlyAudioStream"],
 * });
 *
 * assertStringIncludes(xml, "<duplexList><duplex>HDX</duplex></duplexList>");
 * ```
 */
export const talkAbility: XmlParam<"TalkAbility", TalkAbility> = xmlParam(
  "TalkAbility",
  {
    duplexList: list("duplex", oneOf("FDX", "HDX")),
    audioStreamModeList: list(
      "audioStreamMode",
      oneOf("followVideoStream", "onlyAudioStream"),
    ),
    audioConfigList: optional(list(
      "audioConfig",
      obj({
        priority: int(),
        audioType: oneOf("adpcm", "g711"),
        sampleRate: int(),
        samplePrecision: int(),
        lengthPerEncoder: int(),
        soundTrack: oneOf("mono", "stereo"),
      }),
    )),
  },
);
