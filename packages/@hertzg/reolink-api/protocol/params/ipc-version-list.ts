/**
 * `<IpcVersionList>`: firmware versions of the cameras behind the device,
 * sent with the login (cmd 1).
 *
 * Firmware: `net_ipc_version_x2s` reads up to four `<IpcVersion>` children
 * through `get_ipc_version_from_xmlnode`, which takes `platform`, `version`
 * and `url` as optional text. No serializer for it was found, so the shape
 * is the request the camera accepts.
 *
 * @example Read two versions
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { ipcVersionList } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<IpcVersionList version="1.1">' +
 *     "<IpcVersion><platform>IPC_523SD10</platform></IpcVersion>" +
 *     "<IpcVersion><platform>IPC_51516M5M</platform></IpcVersion>" +
 *     "</IpcVersionList>",
 * ).root;
 *
 * assertEquals(ipcVersionList.decode(root).IpcVersion.length, 2);
 * ```
 *
 * @module
 */

import {
  obj,
  optional,
  repeated,
  text,
  type XmlParam,
  xmlParam,
} from "../xml.ts";

/** The camera firmware versions in `<IpcVersionList>`. */
export type IpcVersionList = {
  /** One entry per camera; the firmware reads at most four. */
  IpcVersion: {
    /** Hardware platform name. */
    platform?: string;
    /** Firmware version string. */
    version?: string;
    /** Firmware download URL. */
    url?: string;
  }[];
};

/**
 * Codec for `<IpcVersionList>`.
 *
 * @example Build an `<IpcVersionList>` element
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { ipcVersionList } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = ipcVersionList.encode({
 *   IpcVersion: [{ platform: "IPC_523SD10", version: "v3.1.0.2898" }],
 * });
 *
 * assertStringIncludes(xml, "<version>v3.1.0.2898</version>");
 * ```
 */
export const ipcVersionList: XmlParam<"IpcVersionList", IpcVersionList> =
  xmlParam("IpcVersionList", {
    IpcVersion: repeated(obj({
      platform: optional(text()),
      version: optional(text()),
      url: optional(text()),
    })),
  });
