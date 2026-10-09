/**
 * `<Compression>`: video encoder settings for the main, sub and third
 * streams. The camera replies with it to cmd 56 (`GET_COMPRESSIONCFG_V20`)
 * and cmd 112 (`GET_DEF_ENC_CFG_V20`), and reads it from cmd 57
 * (`SET_COMPRESSIONCFG_V20`).
 *
 * Firmware: `net_enc_s2x` in the RLC-823A and the Video Doorbell PoE
 * firmware writes every field, always, except `gop`, which it writes on the
 * main and sub streams only when the model supports GOP settings, and never
 * on the third stream. Only the Video Doorbell PoE writes `encoderType`. The
 * parser `net_enc_x2s` in both reads whichever fields are present, so none
 * is required, and never reads `resolutionName` or `encoderType`.
 *
 * @example Read the main stream from a cmd 56 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { compression } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<Compression version="1.1"><channelId>0</channelId>' +
 *     "<mainStream><audio>1</audio><resolutionName>3840*2160</resolutionName>" +
 *     "<width>3840</width><height>2160</height><frame>25</frame>" +
 *     "<bitRate>6144</bitRate><encoderProfile>high</encoderProfile>" +
 *     "</mainStream></Compression>",
 * ).root;
 *
 * assertEquals(compression.decode(root).mainStream?.width, 3840);
 * ```
 *
 * @module
 */

import {
  int,
  obj,
  oneOf,
  optional,
  text,
  type XmlParam,
  xmlParam,
} from "../xml.ts";

/** One stream's encoder settings in `<Compression>`. */
export type CompressionStream = {
  /** 1 to include audio, 0 for video only. */
  audio?: number;
  /** Resolution label; written by the camera, ignored on write. */
  resolutionName?: string;
  /** Width in pixels, 0 or more. */
  width?: number;
  /** Height in pixels, 0 or more. */
  height?: number;
  /**
   * Bit rate control, constant or variable; Video Doorbell PoE only.
   * Written by the camera, ignored on write.
   */
  encoderType?: "vbr" | "cbr";
  /** Frame rate, 0 to 30. */
  frame?: number;
  /** Bit rate, 0 or more. */
  bitRate?: number;
  /** H.264 profile. */
  encoderProfile?: "default" | "baseLine" | "high" | "main";
  /** Keyframe interval; only on models that support GOP settings. */
  gop?: {
    /** Current interval, 0 or more, from `min` to `max`. */
    cur?: number;
    /** Largest allowed interval. */
    max?: number;
    /** Smallest allowed interval. */
    min?: number;
  };
};

/** The video encoder settings in `<Compression>`. */
export type Compression = {
  /** Zero-based channel, 0 to 63. */
  channelId?: number;
  /** 0 or 1; meaning not recovered beyond the name. */
  isNoTranslateFrame?: number;
  /** Main (high resolution) stream. */
  mainStream?: CompressionStream;
  /** Sub (low resolution) stream. */
  subStream?: CompressionStream;
  /** Third stream; the camera never writes `gop` here. */
  thirdStream?: CompressionStream;
};

/**
 * Codec for `<Compression>`.
 *
 * @example Build a `<Compression>` element for cmd 57
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { compression } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = compression.encode({
 *   channelId: 0,
 *   subStream: { frame: 15, bitRate: 512 },
 * });
 *
 * assertStringIncludes(
 *   xml,
 *   "<subStream><frame>15</frame><bitRate>512</bitRate></subStream>",
 * );
 * ```
 */
export const compression: XmlParam<"Compression", Compression> = xmlParam(
  "Compression",
  {
    channelId: optional(int()),
    isNoTranslateFrame: optional(int()),
    mainStream: optional(stream()),
    subStream: optional(stream()),
    thirdStream: optional(stream()),
  },
);

function stream() {
  return obj({
    audio: optional(int()),
    resolutionName: optional(text()),
    width: optional(int()),
    height: optional(int()),
    encoderType: optional(oneOf("vbr", "cbr")),
    frame: optional(int()),
    bitRate: optional(int()),
    encoderProfile: optional(oneOf("default", "baseLine", "high", "main")),
    gop: optional(obj({
      cur: optional(int()),
      max: optional(int()),
      min: optional(int()),
    })),
  });
}
