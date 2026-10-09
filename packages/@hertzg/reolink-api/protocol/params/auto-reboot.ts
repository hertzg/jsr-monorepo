/**
 * `<AutoReboot>`: the scheduled reboot. Written with cmd 100
 * (`SET_AUTO_REBOOT_CFG_V20`) and read with cmd 101
 * (`GET_AUTO_REBOOT_CFG_V20`).
 *
 * Firmware: `nets_auto_reboot_s2x` writes every field always.
 * `nets_auto_reboot_x2s` reads whichever is present and rejects an hour
 * above 23 or a minute or second above 59. It matches `weekDay` ignoring
 * case.
 *
 * @example Read a cmd 101 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { autoReboot } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<AutoReboot version="1.1"><enable>1</enable><weekDay>everyday</weekDay>' +
 *     "<hour>3</hour><minute>30</minute><second>0</second></AutoReboot>",
 * ).root;
 *
 * assertEquals(autoReboot.decode(root).weekDay, "everyday");
 * ```
 *
 * @module
 */

import { int, oneOf, optional, type XmlParam, xmlParam } from "../xml.ts";

/** The scheduled reboot in `<AutoReboot>`. */
export type AutoReboot = {
  /** 1 when the scheduled reboot is on, 0 when off. */
  enable?: number;
  /** Every day, or one day of the week. */
  weekDay?:
    | "everyday"
    | "Sunday"
    | "Monday"
    | "Tuesday"
    | "Wednesday"
    | "Thursday"
    | "Friday"
    | "Saturday";
  /** Hour, 0 to 23. */
  hour?: number;
  /** Minute, 0 to 59. */
  minute?: number;
  /** Second, 0 to 59. */
  second?: number;
};

/**
 * Codec for `<AutoReboot>`.
 *
 * @example Reboot every Sunday at 04:15
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { autoReboot } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = autoReboot.encode({
 *   enable: 1,
 *   weekDay: "Sunday",
 *   hour: 4,
 *   minute: 15,
 *   second: 0,
 * });
 *
 * assertStringIncludes(xml, "<weekDay>Sunday</weekDay>");
 * ```
 */
export const autoReboot: XmlParam<"AutoReboot", AutoReboot> = xmlParam(
  "AutoReboot",
  {
    enable: optional(int()),
    weekDay: optional(
      oneOf(
        "everyday",
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ),
    ),
    hour: optional(int()),
    minute: optional(int()),
    second: optional(int()),
  },
);
