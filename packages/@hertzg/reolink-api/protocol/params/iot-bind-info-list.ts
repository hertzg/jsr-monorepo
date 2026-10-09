/**
 * `<IOTBindInfoList>`: the IoT devices bound to the camera (cmd 393).
 *
 * The reply and the request use different children. The reply lists
 * devices as `<item>`; a request lists them as `<info>`, with the name in
 * `<devName>`:
 *
 * ```
 * reply    <item><deviceType/><name/><uid/><mode/></item>
 * request  <info><devName/><uid/></info>
 * ```
 *
 * Firmware: `net_IoT_bind_info_list_s2x` writes one `<item>` per device, at
 * most 64, with every field, always. `net_IoT_bind_info_list_x2s` reads up
 * to 64 `<info>` elements and skips any field that is missing.
 *
 * @example Read the cmd 393 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { iotBindInfoList } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<IOTBindInfoList version="1.1"><item><deviceType>1</deviceType>' +
 *     "<name>Porch light</name><uid>IOT0000ABCDEF12</uid><mode>0</mode></item>" +
 *     "</IOTBindInfoList>",
 * ).root;
 *
 * assertEquals(iotBindInfoList.decode(root).item?.[0].name, "Porch light");
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

/** The bound IoT devices in `<IOTBindInfoList>`. */
export type IotBindInfoList = {
  /** The devices, as the camera writes them in replies. */
  item?: {
    /** Device type as a number. */
    deviceType: number;
    /** Device name. */
    name: string;
    /** Device uid. */
    uid: string;
    /** Device mode as a number; the firmware does not name the values. */
    mode: number;
  }[];
  /** The devices, as the camera reads them from requests. */
  info?: {
    /** Device name, up to 30 characters. */
    devName?: string;
    /** Device uid, up to 30 characters. */
    uid?: string;
  }[];
};

/**
 * Codec for `<IOTBindInfoList>`.
 *
 * @example Build a request listing one device
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { iotBindInfoList } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = iotBindInfoList.encode({
 *   info: [{ devName: "Porch light", uid: "IOT0000ABCDEF12" }],
 * });
 *
 * assertStringIncludes(xml, "<info><devName>Porch light</devName>");
 * ```
 */
export const iotBindInfoList: XmlParam<"IOTBindInfoList", IotBindInfoList> =
  xmlParam("IOTBindInfoList", {
    item: optional(repeated(obj({
      deviceType: int(),
      name: text(),
      uid: text(),
      mode: int(),
    }))),
    info: optional(repeated(obj({
      devName: optional(text()),
      uid: optional(text()),
    }))),
  });
