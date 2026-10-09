/**
 * `<PtzCruise>`: PTZ patrols (cruises), each a loop over preset positions;
 * set with cmd 20 and listed by cmd 64.
 *
 * Firmware: the cmd 64 reply (`nets_ptz_cruise_get` in netserver; the
 * library `net_ptz_cruise_s2x` writes nothing) always writes `channelId` and
 * `cruiseList`, and for each set patrol `patrolId`, `enable` (always 1),
 * `starting`, `name` and `keyPosList`, with `keyPosId`, `presetId`, `speed`
 * and `dwellTime` for each used key position. `net_ptz_cruise_x2s` requires
 * `channelId` (0 to 63), `patrolId` (0 to 5) in each `<cruise>`, and both
 * `keyPosId` (0 to 15) and `presetId` (-1 to 255) in each `<keyPos>`; the
 * rest it reads as optional.
 *
 * @example Read the cmd 64 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { ptzCruise } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<PtzCruise version="1.1"><channelId>0</channelId><cruiseList>' +
 *     "<cruise><patrolId>0</patrolId><enable>1</enable><starting>0</starting>" +
 *     "<name>yard</name><keyPosList><keyPos><keyPosId>0</keyPosId>" +
 *     "<presetId>1</presetId><speed>30</speed><dwellTime>5</dwellTime>" +
 *     "</keyPos></keyPosList></cruise></cruiseList></PtzCruise>",
 * ).root;
 *
 * assertEquals(ptzCruise.decode(root).cruiseList?.[0].name, "yard");
 * ```
 *
 * @module
 */

import {
  int,
  list,
  obj,
  optional,
  text,
  type XmlParam,
  xmlParam,
} from "../xml.ts";

/** The PTZ patrols in `<PtzCruise>`. */
export type PtzCruise = {
  /** Zero-based channel, 0 to 63. */
  channelId: number;
  /** The patrols; the camera keeps up to six. */
  cruiseList?: {
    /** Patrol id, 0 to 5. */
    patrolId: number;
    /** 1 when the patrol is set; 0 in a request clears it. */
    enable?: number;
    /** 1 when the patrol is running. */
    starting?: number;
    /** Patrol name; up to 31 characters. */
    name?: string;
    /** The stops of the patrol, up to 16. */
    keyPosList?: {
      /** Position in the patrol, 0 to 15. */
      keyPosId: number;
      /** Preset to move to, -1 to 255. */
      presetId: number;
      /** Move speed, 0 to 100. */
      speed?: number;
      /** Time to stay at the preset; at least 1. */
      dwellTime?: number;
    }[];
  }[];
};

/**
 * Codec for `<PtzCruise>`.
 *
 * @example Build a patrol over two presets
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { ptzCruise } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = ptzCruise.encode({
 *   channelId: 0,
 *   cruiseList: [{
 *     patrolId: 1,
 *     enable: 1,
 *     name: "fence",
 *     keyPosList: [
 *       { keyPosId: 0, presetId: 2, speed: 20, dwellTime: 10 },
 *       { keyPosId: 1, presetId: 3, speed: 20, dwellTime: 10 },
 *     ],
 *   }],
 * });
 *
 * assertStringIncludes(xml, "<presetId>3</presetId>");
 * ```
 */
export const ptzCruise: XmlParam<"PtzCruise", PtzCruise> = xmlParam(
  "PtzCruise",
  {
    channelId: int(),
    cruiseList: optional(list(
      "cruise",
      obj({
        patrolId: int(),
        enable: optional(int()),
        starting: optional(int()),
        name: optional(text()),
        keyPosList: optional(list(
          "keyPos",
          obj({
            keyPosId: int(),
            presetId: int(),
            speed: optional(int()),
            dwellTime: optional(int()),
          }),
        )),
      }),
    )),
  },
);
