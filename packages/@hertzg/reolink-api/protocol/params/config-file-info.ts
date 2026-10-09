/**
 * `<ConfigFileInfo>`: a configuration file transfer, named by cmd 65
 * (`EXPORT_CFG_V20`) and cmd 67 (`UPDATE_DEVICE`).
 *
 * Firmware: `net_cfg_file_info_x2s` reads whichever fields are present.
 * There is no serializer: the camera never writes this element. On this
 * firmware the cmd 65 handler is a stub that always fails.
 *
 * @example Read a `<ConfigFileInfo>` request
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { configFileInfo } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<ConfigFileInfo version="1.1"><fileName>cfg.bin</fileName>' +
 *     "<fileSize>4096</fileSize></ConfigFileInfo>",
 * ).root;
 *
 * assertEquals(configFileInfo.decode(root), { fileName: "cfg.bin", fileSize: 4096 });
 * ```
 *
 * @module
 */

import { int, optional, text, uint, type XmlParam, xmlParam } from "../xml.ts";

/** The configuration file transfer in `<ConfigFileInfo>`. */
export type ConfigFileInfo = {
  /** File name, up to 255 characters. */
  fileName?: string;
  /** Total file size. */
  fileSize?: number;
  /** Size transferred so far. */
  curSize?: number;
  /** Boolean flag: 1 to apply the parameters in the file. */
  updateParameter?: number;
  /** Factory use marker, read as an integer. */
  usedForFactory?: number;
};

/**
 * Codec for `<ConfigFileInfo>`.
 *
 * @example Build a `<ConfigFileInfo>` element
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { configFileInfo } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = configFileInfo.encode({
 *   fileName: "backup.cfg",
 *   fileSize: 2048,
 *   curSize: 0,
 *   updateParameter: 1,
 * });
 *
 * assertStringIncludes(xml, "<updateParameter>1</updateParameter>");
 * ```
 */
export const configFileInfo: XmlParam<"ConfigFileInfo", ConfigFileInfo> =
  xmlParam("ConfigFileInfo", {
    fileName: optional(text()),
    fileSize: optional(uint()),
    curSize: optional(uint()),
    updateParameter: optional(int()),
    usedForFactory: optional(int()),
  });
