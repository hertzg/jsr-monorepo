/**
 * `<CloudUploadCfg>`: whether recordings upload to the Reolink cloud, and
 * which streams. Read with cmd 270, written with cmd 271.
 *
 * Firmware: `nets_cloud_upload_cfg_s2x` writes every field; the stream
 * lists are three integers joined with commas. `nets_cloud_upload_x2s`
 * skips any field that is missing, so every field is optional.
 *
 * @example Read the cmd 270 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { cloudUploadCfg } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<CloudUploadCfg version="1.1"><enable>1</enable><version>2</version>' +
 *     "<streamOpList>1,1,0</streamOpList><streamCfgList>0,1,0</streamCfgList>" +
 *     "</CloudUploadCfg>",
 * ).root;
 *
 * assertEquals(cloudUploadCfg.decode(root).streamCfgList, "0,1,0");
 * ```
 *
 * @module
 */

import { int, optional, text, type XmlParam, xmlParam } from "../xml.ts";

/** The cloud upload settings in `<CloudUploadCfg>`. */
export type CloudUploadCfg = {
  /** 1 when cloud upload is on. */
  enable?: number;
  /** A settings version number, written as a child element. */
  version?: number;
  /** Three comma-separated integers, one per stream. */
  streamOpList?: string;
  /** Three comma-separated integers, one per stream. */
  streamCfgList?: string;
};

/**
 * Codec for `<CloudUploadCfg>`.
 *
 * @example Turn cloud upload on
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cloudUploadCfg } from "@hertzg/reolink-api/protocol/params";
 *
 * assertEquals(
 *   cloudUploadCfg.encode({ enable: 1 }),
 *   '<CloudUploadCfg version="1.1"><enable>1</enable></CloudUploadCfg>',
 * );
 * ```
 */
export const cloudUploadCfg: XmlParam<"CloudUploadCfg", CloudUploadCfg> =
  xmlParam("CloudUploadCfg", {
    enable: optional(int()),
    version: optional(int()),
    streamOpList: optional(text()),
    streamCfgList: optional(text()),
  });
