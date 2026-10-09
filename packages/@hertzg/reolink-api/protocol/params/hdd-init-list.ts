/**
 * `<HddInitList>`: the storage devices to format, sent with cmd 103
 * (`INIT_HDD_V20`).
 *
 * Firmware: `nets_param_init_hdd_x2s` walks at most the first 10 children,
 * takes every `<HddInit>` among them and reads its `initId`, ignoring a
 * failed read. There is no serializer: the camera never writes this element.
 *
 * @example Read an `<HddInitList>` request
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { hddInitList } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<HddInitList version="1.1"><HddInit><initId>0</initId></HddInit></HddInitList>',
 * ).root;
 *
 * assertEquals(hddInitList.decode(root), { HddInit: [{ initId: 0 }] });
 * ```
 *
 * @module
 */

import {
  int,
  obj,
  optional,
  repeated,
  type XmlParam,
  xmlParam,
} from "../xml.ts";

/** The storage devices to format in `<HddInitList>`. */
export type HddInitList = {
  /** One entry per device to format; the firmware reads at most 10. */
  HddInit: {
    /** The device to format. */
    initId?: number;
  }[];
};

/**
 * Codec for `<HddInitList>`.
 *
 * @example Format the first storage device
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { hddInitList } from "@hertzg/reolink-api/protocol/params";
 *
 * assertEquals(
 *   hddInitList.encode({ HddInit: [{ initId: 0 }] }),
 *   '<HddInitList version="1.1"><HddInit><initId>0</initId></HddInit></HddInitList>',
 * );
 * ```
 */
export const hddInitList: XmlParam<"HddInitList", HddInitList> = xmlParam(
  "HddInitList",
  {
    HddInit: repeated(obj({
      initId: optional(int()),
    })),
  },
);
