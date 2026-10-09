/**
 * `<HddInfoList>`: the storage devices (SD card or disk) and their space, as
 * cmd 102 (`GET_HDD_CFG_V20`) replies.
 *
 * Firmware: the cmd 102 handler in `netserver` writes one `<HddInfo>` per
 * device, at most 8, each with every field. Each size is split into a
 * quotient and remainder of 1024: `capacity` is the size divided by 1024 and
 * `capacityM` what is left, likewise `remainSize` and `remainSizeM`. There is
 * no parser: the camera never reads this element.
 *
 * @example Read a cmd 102 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { hddInfoList } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<HddInfoList version="1.1"><HddInfo><number>0</number><capacity>119</capacity>' +
 *     "<capacityM>256</capacityM><format>1</format><mount>1</mount>" +
 *     "<remainSize>80</remainSize><remainSizeM>512</remainSizeM></HddInfo></HddInfoList>",
 * ).root;
 *
 * assertEquals(hddInfoList.decode(root).HddInfo[0].capacity, 119);
 * ```
 *
 * @module
 */

import { int, obj, repeated, type XmlParam, xmlParam } from "../xml.ts";

/** The storage devices in `<HddInfoList>`. */
export type HddInfoList = {
  /** One entry per storage device, in the firmware's order. */
  HddInfo: {
    /** Device number; the firmware adds 100 when it matches an id it looks up internally. */
    number: number;
    /** Total size divided by 1024. */
    capacity: number;
    /** Total size modulo 1024. */
    capacityM: number;
    /** Format state flag. */
    format: number;
    /** Mount state flag. */
    mount: number;
    /** Free size divided by 1024. */
    remainSize: number;
    /** Free size modulo 1024. */
    remainSizeM: number;
  }[];
};

/**
 * Codec for `<HddInfoList>`.
 *
 * @example Build an `<HddInfoList>` element
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { hddInfoList } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = hddInfoList.encode({
 *   HddInfo: [{
 *     number: 0,
 *     capacity: 59,
 *     capacityM: 640,
 *     format: 1,
 *     mount: 1,
 *     remainSize: 12,
 *     remainSizeM: 3,
 *   }],
 * });
 *
 * assertStringIncludes(xml, "<HddInfo><number>0</number><capacity>59</capacity>");
 * ```
 */
export const hddInfoList: XmlParam<"HddInfoList", HddInfoList> = xmlParam(
  "HddInfoList",
  {
    HddInfo: repeated(obj({
      number: int(),
      capacity: int(),
      capacityM: int(),
      format: int(),
      mount: int(),
      remainSize: int(),
      remainSizeM: int(),
    })),
  },
);
