/**
 * `<dingdongCfg>`: which alarms ring each paired chime (dingdong), and with
 * which tune. Read with cmd 486, written with cmd 487.
 *
 * Firmware (Video Doorbell PoE): `net_dingdong_cfg_x2s` reads
 * `pairThreshold` and repeated `<deviceCfg>`, each with `id` and repeated
 * `<alarminCfg>` { `type`, `valid`, `musicId` }, skipping any that are
 * missing. It rejects a negative `id`, updates only one of 10 existing
 * slots with a matching `id`, copies only rules whose `valid` is 0 or 1,
 * and logs and skips an unknown `type`. No library serializer exists. The
 * cmd 486 reply is built in netserver (0x94fb8): one `<deviceCfg>` per
 * slot with a non-negative `id`, holding `id`, `name` and one
 * `<alarminCfg>` per alarm type the doorbell supports. It never writes
 * `pairThreshold`, and the parser never reads `name`. Every field is
 * optional.
 *
 * @example Read a cmd 486 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { dingdongCfg } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<dingdongCfg version="1.1"><deviceCfg><id>0</id><name>Chime</name>' +
 *     "<alarminCfg><type>visitor</type><valid>1</valid><musicId>1</musicId>" +
 *     "</alarminCfg></deviceCfg></dingdongCfg>",
 * ).root;
 *
 * assertEquals(dingdongCfg.decode(root).deviceCfg[0].alarminCfg, [
 *   { type: "visitor", valid: 1, musicId: 1 },
 * ]);
 * ```
 *
 * @module
 */

import {
  int,
  obj,
  oneOf,
  optional,
  repeated,
  text,
  uint,
  type XmlParam,
  xmlParam,
} from "../xml.ts";

/** One alarm rule of a chime, an `<alarminCfg>` in `<deviceCfg>`. */
export type DingdongCfgAlarm = {
  /** The alarm that rings the chime; the reply lists only supported types. */
  type?: "visitor" | "people" | "package" | "MD" | "vehicle" | "dog_cat";
  /** 1 when the rule is on; the firmware copies only 0 or 1. */
  valid?: number;
  /** Ringtone id. */
  musicId?: number;
};

/** One paired chime, a `<deviceCfg>` in `<dingdongCfg>`. */
export type DingdongCfgDevice = {
  /** Chime id, 0 or more. */
  id?: number;
  /** Chime name; cmd 486 reply only. */
  name?: string;
  /** The chime's alarm rules. */
  alarminCfg: DingdongCfgAlarm[];
};

/** The chime alarm rules in `<dingdongCfg>`. */
export type DingdongCfg = {
  /** The paired chimes. */
  deviceCfg: DingdongCfgDevice[];
  /** Pairing threshold; request only. Its meaning is not established. */
  pairThreshold?: number;
};

/**
 * Codec for `<dingdongCfg>`.
 *
 * @example Build a cmd 487 request
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { dingdongCfg } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = dingdongCfg.encode({
 *   deviceCfg: [{
 *     id: 0,
 *     alarminCfg: [{ type: "package", valid: 1, musicId: 2 }],
 *   }],
 * });
 *
 * assertStringIncludes(xml, "<alarminCfg><type>package</type>");
 * ```
 */
export const dingdongCfg: XmlParam<"dingdongCfg", DingdongCfg> = xmlParam(
  "dingdongCfg",
  {
    deviceCfg: repeated(obj({
      id: optional(int()),
      name: optional(text()),
      alarminCfg: repeated(obj({
        type: optional(
          oneOf("visitor", "people", "package", "MD", "vehicle", "dog_cat"),
        ),
        valid: optional(uint()),
        musicId: optional(uint()),
      })),
    })),
    pairThreshold: optional(int()),
  },
);
