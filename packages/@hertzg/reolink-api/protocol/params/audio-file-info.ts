/**
 * `<audioFileInfo>`: a custom alarm sound file. Sent with cmd 260 (get
 * info), 261 (import), 262 (save), 348 (delete) and 349 (play).
 *
 * Firmware: `nets_audio_file_info_s2x` writes `channelId` and `fileSize`,
 * always. `nets_param_audio_file_info_x2s` reads whichever fields are
 * present, so every field is optional; it rejects a `fileSize` below 1.
 * `audioLen`, `customName`, `id` and `timeout` are read but never written.
 *
 * @example Build a cmd 261 import request
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { audioFileInfo } from "@hertzg/reolink-api/protocol/params";
 *
 * assertEquals(
 *   audioFileInfo.encode({ channelId: 0, fileSize: 32000, customName: "bark" }),
 *   '<audioFileInfo version="1.1"><channelId>0</channelId>' +
 *     "<fileSize>32000</fileSize><customName>bark</customName></audioFileInfo>",
 * );
 * ```
 *
 * @module
 */

import { int, optional, text, type XmlParam, xmlParam } from "../xml.ts";

/** The custom alarm sound file in `<audioFileInfo>`. */
export type AudioFileInfo = {
  /** Zero-based channel. */
  channelId?: number;
  /** File size in bytes, at least 1. */
  fileSize?: number;
  /** Audio length; read only. */
  audioLen?: number;
  /** Display name, read into a 128-byte buffer; read only. */
  customName?: string;
  /** File id; read only. */
  id?: number;
  /** Timeout; read only. */
  timeout?: number;
};

/**
 * Codec for `<audioFileInfo>`.
 *
 * @example Read the `<audioFileInfo>` the camera writes
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { audioFileInfo } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<audioFileInfo version="1.1"><channelId>0</channelId>' +
 *     "<fileSize>48000</fileSize></audioFileInfo>",
 * ).root;
 *
 * assertEquals(audioFileInfo.decode(root), { channelId: 0, fileSize: 48000 });
 * ```
 */
export const audioFileInfo: XmlParam<"audioFileInfo", AudioFileInfo> = xmlParam(
  "audioFileInfo",
  {
    channelId: optional(int()),
    fileSize: optional(int()),
    audioLen: optional(int()),
    customName: optional(text()),
    id: optional(int()),
    timeout: optional(int()),
  },
);
