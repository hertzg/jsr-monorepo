/**
 * `<AudioEncodeAbility>`: the audio encodings the camera supports, read
 * with cmd 267.
 *
 * Firmware: `nets_audio_encode_ability_s2x` writes `channelId` and
 * `maxCapacity` always, and `<audioEncodeList>` only when at least one
 * encoding is enabled; it skips an entry whose type or sound track is
 * outside the known values. `nets_param_audio_encode_ability_x2s` reads
 * whichever top-level fields are present, so those are optional. It keeps
 * at most three `<audioEncode>` entries and drops one that lacks any of its
 * five fields.
 *
 * @example Read a cmd 267 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { audioEncodeAbility } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<AudioEncodeAbility version="1.1"><channelId>0</channelId>' +
 *     "<maxCapacity>1</maxCapacity><audioEncodeList><audioEncode>" +
 *     "<audioType>adpcm</audioType><sampleRate>16000</sampleRate>" +
 *     "<samplePrecision>16</samplePrecision><lengthPerEncoder>1024</lengthPerEncoder>" +
 *     "<soundTrack>mono</soundTrack></audioEncode></audioEncodeList>" +
 *     "</AudioEncodeAbility>",
 * ).root;
 *
 * assertEquals(audioEncodeAbility.decode(root).audioEncodeList?.[0].audioType, "adpcm");
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

/** The supported audio encodings in `<AudioEncodeAbility>`. */
export type AudioEncodeAbility = {
  /** Zero-based channel. */
  channelId?: number;
  /** Capacity, as a number. */
  maxCapacity?: number;
  /** One `<audioEncode>` per enabled encoding; absent when none is. */
  audioEncodeList?: {
    /** Codec. */
    audioType: "adpcm" | "g711";
    /** Sample rate. */
    sampleRate: number;
    /** Bits per sample. */
    samplePrecision: number;
    /** Encoder frame length. */
    lengthPerEncoder: number;
    /** Channel layout. */
    soundTrack: "mono" | "stereo";
  }[];
};

/**
 * Codec for `<AudioEncodeAbility>`.
 *
 * @example Build a `<AudioEncodeAbility>` element
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { audioEncodeAbility } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = audioEncodeAbility.encode({
 *   channelId: 0,
 *   maxCapacity: 2,
 *   audioEncodeList: [{
 *     audioType: "g711",
 *     sampleRate: 8000,
 *     samplePrecision: 16,
 *     lengthPerEncoder: 320,
 *     soundTrack: "stereo",
 *   }],
 * });
 *
 * assertStringIncludes(xml, "<audioEncodeList><audioEncode><audioType>g711</audioType>");
 * ```
 */
export const audioEncodeAbility: XmlParam<
  "AudioEncodeAbility",
  AudioEncodeAbility
> = xmlParam("AudioEncodeAbility", {
  channelId: optional(int()),
  maxCapacity: optional(int()),
  audioEncodeList: optional(
    list(
      "audioEncode",
      obj({
        audioType: oneOf("adpcm", "g711"),
        sampleRate: int(),
        samplePrecision: int(),
        lengthPerEncoder: int(),
        soundTrack: oneOf("mono", "stereo"),
      }),
    ),
  ),
});
