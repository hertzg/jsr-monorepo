/**
 * `<NasUploadCfg>`: whether recordings upload to a NAS, and which streams.
 * Read with cmd 304, written with cmd 305.
 *
 * Firmware: the cmd 304 handler (`nets_nas_cfg_get`) writes every field,
 * always. `nets_param_nas_cfg_x2s` skips any field that is missing, so
 * every field is optional.
 *
 * @example Read the cmd 304 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { nasUploadCfg } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<NasUploadCfg version="1.1"><enable>1</enable>' +
 *     "<streamAbility>3</streamAbility><streamConfig>1</streamConfig>" +
 *     "</NasUploadCfg>",
 * ).root;
 *
 * assertEquals(nasUploadCfg.decode(root).streamConfig, 1);
 * ```
 *
 * @module
 */

import { int, optional, type XmlParam, xmlParam } from "../xml.ts";

/** The NAS upload settings in `<NasUploadCfg>`. */
export type NasUploadCfg = {
  /** 1 when NAS upload is on. */
  enable?: number;
  /** Streams the camera can upload, as a number. */
  streamAbility?: number;
  /** Streams chosen for upload, as a number. */
  streamConfig?: number;
};

/**
 * Codec for `<NasUploadCfg>`.
 *
 * @example Turn NAS upload on
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { nasUploadCfg } from "@hertzg/reolink-api/protocol/params";
 *
 * assertEquals(
 *   nasUploadCfg.encode({ enable: 1 }),
 *   '<NasUploadCfg version="1.1"><enable>1</enable></NasUploadCfg>',
 * );
 * ```
 */
export const nasUploadCfg: XmlParam<"NasUploadCfg", NasUploadCfg> = xmlParam(
  "NasUploadCfg",
  {
    enable: optional(int()),
    streamAbility: optional(int()),
    streamConfig: optional(int()),
  },
);
