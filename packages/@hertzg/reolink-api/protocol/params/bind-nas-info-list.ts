/**
 * `<BindNasInfoList>`: the NAS devices the camera is bound to. Read with
 * cmd 281.
 *
 * Firmware: `net_nas_bind_info_list_s2x` writes one `<info>` per bound NAS,
 * directly under `<BindNasInfoList>`, each with `devName`, `uid` and
 * `bBinded` (always 1). `net_nas_bind_info_list_x2s` reads at most 32
 * `<info>` and skips any field that is missing, so every field is
 * optional.
 *
 * @example Read the cmd 281 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { bindNasInfoList } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<BindNasInfoList version="1.1"><info><devName>Basement NAS</devName>' +
 *     "<uid>95270000ABCDEF12</uid><bBinded>1</bBinded></info></BindNasInfoList>",
 * ).root;
 *
 * assertEquals(bindNasInfoList.decode(root).info?.[0].devName, "Basement NAS");
 * ```
 *
 * @module
 */

import {
  int,
  obj,
  optional,
  repeated,
  text,
  type XmlParam,
  xmlParam,
} from "../xml.ts";

/** One bound NAS in `<BindNasInfoList>`. */
export type BindNasInfo = {
  /** NAS device name. */
  devName?: string;
  /** NAS device UID. */
  uid?: string;
  /** 1 when bound; the firmware always writes 1 and never reads it. */
  bBinded?: number;
};

/** The bound NAS devices in `<BindNasInfoList>`. */
export type BindNasInfoList = {
  /** One entry per bound NAS, as repeated `<info>` elements. */
  info?: BindNasInfo[];
};

/**
 * Codec for `<BindNasInfoList>`.
 *
 * @example Build a list with one NAS
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { bindNasInfoList } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = bindNasInfoList.encode({
 *   info: [{ devName: "Basement NAS", uid: "95270000ABCDEF12" }],
 * });
 *
 * assertStringIncludes(xml, "<info><devName>Basement NAS</devName>");
 * ```
 */
export const bindNasInfoList: XmlParam<"BindNasInfoList", BindNasInfoList> =
  xmlParam("BindNasInfoList", {
    info: optional(repeated(obj({
      devName: optional(text()),
      uid: optional(text()),
      bBinded: optional(int()),
    }))),
  });
