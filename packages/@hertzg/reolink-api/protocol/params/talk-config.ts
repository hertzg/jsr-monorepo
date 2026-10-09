/**
 * `<TalkConfig>`: the two-way audio session a client opens. Sent with
 * cmd 201.
 *
 * Firmware: `nets_talk_cfg_x2s` reads each field when present and skips
 * the rest; it ignores an unknown `duplex` or `audioStreamMode`. Inside
 * `audioConfig`, `get_audioConfig_from_xmlnode` requires `audioType`,
 * `sampleRate`, `samplePrecision`, `lengthPerEncoder` and `soundTrack`,
 * rejects an unknown `audioType` or `soundTrack`, and rejects a `priority`
 * above 31. No serializer exists, so the camera never writes this element.
 *
 * @example Build a cmd 201 request
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { talkConfig } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = talkConfig.encode({
 *   duplex: "FDX",
 *   audioStreamMode: "followVideoStream",
 *   audioConfig: {
 *     audioType: "adpcm",
 *     sampleRate: 16000,
 *     samplePrecision: 16,
 *     lengthPerEncoder: 1024,
 *     soundTrack: "mono",
 *   },
 * });
 *
 * assertStringIncludes(xml, "<audioType>adpcm</audioType>");
 * ```
 *
 * @module
 */

import { int, obj, oneOf, optional, type XmlParam, xmlParam } from "../xml.ts";

/** The audio format of the talk session, in `<audioConfig>`. */
export type TalkAudioConfig = {
  /** Priority, 0 to 31. */
  priority?: number;
  /** Audio codec. */
  audioType: "adpcm" | "g711";
  /** Sample rate in Hz. */
  sampleRate: number;
  /** Bits per sample. */
  samplePrecision: number;
  /** Bytes per encoder frame. */
  lengthPerEncoder: number;
  /** Channel layout. */
  soundTrack: "mono" | "stereo";
};

/** The two-way audio session in `<TalkConfig>`. */
export type TalkConfig = {
  /** Full or half duplex. */
  duplex?: "FDX" | "HDX";
  /**
   * Whether talk audio rides the video stream, its own stream, or a mix.
   * `mixAudioStream` is Video Doorbell PoE only.
   */
  audioStreamMode?: "followVideoStream" | "onlyAudioStream" | "mixAudioStream";
  /** The audio format. */
  audioConfig?: TalkAudioConfig;
};

/**
 * Codec for `<TalkConfig>`.
 *
 * @example Read a `<TalkConfig>` element
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { talkConfig } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<TalkConfig version="1.1"><duplex>HDX</duplex></TalkConfig>',
 * ).root;
 *
 * assertEquals(talkConfig.decode(root), { duplex: "HDX" });
 * ```
 */
export const talkConfig: XmlParam<"TalkConfig", TalkConfig> = xmlParam(
  "TalkConfig",
  {
    duplex: optional(oneOf("FDX", "HDX")),
    audioStreamMode: optional(
      oneOf("followVideoStream", "onlyAudioStream", "mixAudioStream"),
    ),
    audioConfig: optional(obj({
      priority: optional(int()),
      audioType: oneOf("adpcm", "g711"),
      sampleRate: int(),
      samplePrecision: int(),
      lengthPerEncoder: int(),
      soundTrack: oneOf("mono", "stereo"),
    })),
  },
);
