/**
 * `<StreamInfoList>`: the encoder capabilities of each channel group: the
 * resolution, default frame rate and bitrate, and the choices offered for
 * every stream. Sent in the reply to cmd 146.
 *
 * Firmware: `nets_param_stream_info_s2x` is empty; `xml_enc_info_list_s2x`
 * writes the element. For each `<StreamInfo>` it always writes
 * `channelBits` and two `<encodeTable>` elements, `mainStream` then
 * `subStream`, with every field except `defaultGop`, which it writes only
 * when the model supports GOP setting. `nets_param_stream_info_x2s` reads
 * up to 16 `<StreamInfo>` elements, and also accepts `mobileStream` and
 * `externStream` tables.
 *
 * @example Read the cmd 146 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { streamInfoList } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<StreamInfoList version="1.1"><StreamInfo><channelBits>1</channelBits>' +
 *     "<encodeTable><type>mainStream</type>" +
 *     "<resolution><width>3840</width><height>2160</height></resolution>" +
 *     "<defaultFramerate>25</defaultFramerate><defaultBitrate>6144</defaultBitrate>" +
 *     "<framerateTable>25,22,20,18,16,15,12,10,8,6,4,2</framerateTable>" +
 *     "<bitrateTable>4096,5120,6144,7168,8192</bitrateTable></encodeTable>" +
 *     "</StreamInfo></StreamInfoList>",
 * ).root;
 *
 * assertEquals(
 *   streamInfoList.decode(root).StreamInfo[0].encodeTable[0].resolution.width,
 *   3840,
 * );
 * ```
 *
 * @module
 */

import {
  int,
  obj,
  oneOf,
  optional,
  repeated,
  text,
  type XmlParam,
  xmlParam,
} from "../xml.ts";

/** One stream's encoder choices, in `<encodeTable>`. */
export type StreamInfoEncodeTable = {
  /** Which stream this table describes. */
  type: "mainStream" | "subStream" | "mobileStream" | "externStream";
  /** The stream's resolution. */
  resolution: {
    /** Width in pixels. */
    width: number;
    /** Height in pixels. */
    height: number;
  };
  /** Default frame rate. */
  defaultFramerate: number;
  /** Default bitrate. */
  defaultBitrate: number;
  /**
   * Allowed frame rates as comma-separated integers, such as `25,20,15`;
   * at most 25, trailing zeros dropped.
   */
  framerateTable: string;
  /**
   * Allowed bitrates as comma-separated integers; at most 16, trailing
   * zeros dropped.
   */
  bitrateTable: string;
  /** Default GOP length; only on models that support GOP setting. */
  defaultGop?: number;
};

/** One group of channels and its streams, in `<StreamInfo>`. */
export type StreamInfo = {
  /** Bit mask of the channels this entry applies to. */
  channelBits: number;
  /** One table per stream, as repeated `<encodeTable>` elements. */
  encodeTable: StreamInfoEncodeTable[];
};

/** The encoder capabilities in `<StreamInfoList>`. */
export type StreamInfoList = {
  /** One entry per channel group, as repeated `<StreamInfo>` elements. */
  StreamInfo: StreamInfo[];
};

/**
 * Codec for `<StreamInfoList>`.
 *
 * @example Build a `<StreamInfoList>` element
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { streamInfoList } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = streamInfoList.encode({
 *   StreamInfo: [{
 *     channelBits: 1,
 *     encodeTable: [{
 *       type: "subStream",
 *       resolution: { width: 640, height: 360 },
 *       defaultFramerate: 15,
 *       defaultBitrate: 256,
 *       framerateTable: "15,10,7,4",
 *       bitrateTable: "64,128,160,192,256",
 *     }],
 *   }],
 * });
 *
 * assertStringIncludes(xml, "<resolution><width>640</width><height>360</height></resolution>");
 * ```
 */
export const streamInfoList: XmlParam<"StreamInfoList", StreamInfoList> =
  xmlParam("StreamInfoList", {
    StreamInfo: repeated(obj({
      channelBits: int(),
      encodeTable: repeated(obj({
        type: oneOf("mainStream", "subStream", "mobileStream", "externStream"),
        resolution: obj({
          width: int(),
          height: int(),
        }),
        defaultFramerate: int(),
        defaultBitrate: int(),
        framerateTable: text(),
        bitrateTable: text(),
        defaultGop: optional(int()),
      })),
    })),
  });
