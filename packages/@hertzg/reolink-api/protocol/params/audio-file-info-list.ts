/**
 * `<audioFileInfoList>`: the custom audio files stored on a Video Doorbell
 * PoE. Sent with cmd 368 to name files, returned by cmd 347.
 *
 * Firmware (Video Doorbell PoE): `nets_param_audio_file_info_list_x2s`
 * reads up to 32 `<audioFileInfo>` children, and in each one only
 * `fileName`, `id` and `extId`, skipping any that are missing. The cmd 347
 * reply is built in netserver (0x942e4), not by a library serializer: it
 * writes one `<audioFileInfo>` per used slot with every item field, then
 * `maxFileNumber`, which is always 12. Every item field is optional because
 * the request reads only three of them and requires none.
 *
 * @example Read a cmd 347 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { audioFileInfoList } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<audioFileInfoList version="1.1"><audioFileInfo><id>3</id>' +
 *     "<fileSize>48000</fileSize><audioLen>6</audioLen>" +
 *     "<fileName>welcome.wav</fileName><extId>ext-1</extId>" +
 *     "<type>reply</type></audioFileInfo>" +
 *     "<maxFileNumber>12</maxFileNumber></audioFileInfoList>",
 * ).root;
 *
 * assertEquals(audioFileInfoList.decode(root).audioFileInfo[0].type, "reply");
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

/** One stored audio file, an `<audioFileInfo>` in `<audioFileInfoList>`. */
export type AudioFileInfoListItem = {
  /** Slot id of the file; read by cmd 368, written by cmd 347. */
  id?: number;
  /** File size in bytes; cmd 347 reply only. */
  fileSize?: number;
  /** Audio length; cmd 347 reply only. The unit is not established. */
  audioLen?: number;
  /** File name; up to 127 bytes are read. */
  fileName?: string;
  /** External id of the file; up to 63 bytes are read. */
  extId?: string;
  /** What the file is used for; cmd 347 reply only. */
  type?: "alarm" | "reply";
};

/** One file in the RLC-823A's cmd 347 reply, an `<item>`. */
export type AudioFileInfoListLegacyItem = {
  /** Slot id of the file. */
  id?: number;
  /** File size in bytes. */
  fileSize?: number;
  /** Audio length. The unit is not established. */
  audioLen?: number;
  /** The name the user gave the file. */
  customName?: string;
};

/** The audio file list in `<audioFileInfoList>`. */
export type AudioFileInfoList = {
  /** The files, one `<audioFileInfo>` each; the firmware reads up to 32. */
  audioFileInfo: AudioFileInfoListItem[];
  /**
   * The files as the RLC-823A writes them in its cmd 347 reply, one `<item>`
   * each. RLC-823A only; absent when there are none.
   */
  item?: AudioFileInfoListLegacyItem[];
  /** How many files the doorbell can hold; cmd 347 reply only, always 12. */
  maxFileNumber?: number;
};

/**
 * Codec for `<audioFileInfoList>`.
 *
 * @example Build a cmd 368 request
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { audioFileInfoList } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = audioFileInfoList.encode({
 *   audioFileInfo: [{ id: 3, fileName: "welcome.wav", extId: "ext-1" }],
 * });
 *
 * assertStringIncludes(xml, "<audioFileInfo><id>3</id>");
 * ```
 */
export const audioFileInfoList: XmlParam<
  "audioFileInfoList",
  AudioFileInfoList
> = xmlParam("audioFileInfoList", {
  audioFileInfo: repeated(obj({
    id: optional(int()),
    fileSize: optional(int()),
    audioLen: optional(int()),
    fileName: optional(text()),
    extId: optional(text()),
    type: optional(oneOf("alarm", "reply")),
  })),
  item: optional(repeated(obj({
    id: optional(int()),
    fileSize: optional(int()),
    audioLen: optional(int()),
    customName: optional(text()),
  }))),
  maxFileNumber: optional(int()),
});
