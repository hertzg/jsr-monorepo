/**
 * Line crossing detection: the lines a target must cross to raise an alert.
 *
 * The document lives at `/ISAPI/Smart/LineDetection/<channel>`, where
 * `<channel>` is the video input channel: 1..N on an NVR, 1 on a camera.
 * Unlike the region rules in `rules.ts`, the root holds a `<LineItemList>`
 * of `<LineItem>`s, each with a two-point `<CoordinatesList>` and a
 * `<directionSensitivity>`. The points are drawn in the same normalized
 * screen space, 1000 x 1000 by default. A device without the feature
 * answers a `<ResponseStatus>` with `subStatusCode notSupport`.
 *
 * ```xml
 * <LineDetection>
 * <id>1</id>
 * <enabled>true</enabled>
 * <normalizedScreenSize>
 * <normalizedScreenWidth>1000</normalizedScreenWidth>
 * <normalizedScreenHeight>1000</normalizedScreenHeight>
 * </normalizedScreenSize>
 * <LineItemList size="1">
 * <LineItem>
 * <id>1</id>
 * <enabled>false</enabled>
 * <sensitivityLevel>45</sensitivityLevel>
 * <directionSensitivity>any</directionSensitivity>
 * <CoordinatesList>
 * <Coordinates><positionX>826</positionX><positionY>767</positionY></Coordinates>
 * <Coordinates><positionX>880</positionX><positionY>762</positionY></Coordinates>
 * </CoordinatesList>
 * <detectionTarget>human,vehicle</detectionTarget>
 * <alarmConfidence opt="low,mediumLow,mediumHigh,high">low</alarmConfidence>
 * </LineItem>
 * </LineItemList>
 * </LineDetection>
 * ```
 *
 * Its alerts carry the `<eventType>` `linedetection`.
 *
 * @example Parse a crossing line
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { lineDetection } from "./line-detection.ts";
 *
 * const line = lineDetection().codec.parse(
 *   "<LineDetection><id>1</id><enabled>true</enabled><LineItemList size=\"1\" >" +
 *     "<LineItem><id>1</id><enabled>true</enabled><directionSensitivity>any</directionSensitivity>" +
 *     "<CoordinatesList>" +
 *     "<Coordinates><positionX>100</positionX><positionY>500</positionY></Coordinates>" +
 *     "<Coordinates><positionX>900</positionX><positionY>500</positionY></Coordinates>" +
 *     "</CoordinatesList><detectionTarget>human,vehicle</detectionTarget>" +
 *     "</LineItem></LineItemList></LineDetection>",
 * );
 *
 * assertEquals(line.channel, 1);
 * assertEquals(line.lines, [{
 *   id: 1,
 *   enabled: true,
 *   directionSensitivity: "any",
 *   coordinates: [{ x: 100, y: 500 }, { x: 900, y: 500 }],
 *   detectionTarget: ["human", "vehicle"],
 * }]);
 * ```
 *
 * @module
 */

import {
  bool,
  type Decoded,
  document,
  int,
  list,
  obj,
  optional,
  points,
  text,
} from "../document.ts";
import type { Resource } from "../request.ts";
import {
  type NormalizedScreenSize,
  ruleFields,
  screenSize,
  type SmartRule,
  toRule,
} from "./rules.ts";

/** One `<LineItem>`: a line whose crossing raises `linedetection`. */
export type LineDetectionLine = SmartRule & {
  /** `<directionSensitivity>`: `any`, `left-right` or `right-left`, when present. */
  directionSensitivity?: string;
};

/** The fields of `<LineDetection>`. */
export type LineDetection = {
  /** `<id>`: the video channel the lines apply to. */
  channel: number;
  /** `<enabled>`: whether line crossing detection runs at all. */
  enabled: boolean;
  /** `<normalizedScreenSize>`, when present. */
  normalizedScreenSize?: NormalizedScreenSize;
  /** The lines, in document order. */
  lines: LineDetectionLine[];
};

/**
 * The line crossing document of one channel.
 *
 * @param options Which channel; defaults to `1`.
 * @returns The resource: its path and the codec that reads it.
 *
 * @example An NVR's second channel
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { resolvesNext, spy } from "@std/testing/mock";
 * import { read } from "../request.ts";
 * import { lineDetection } from "./line-detection.ts";
 *
 * assertEquals(lineDetection().path, "/ISAPI/Smart/LineDetection/1");
 *
 * const fetch = spy(resolvesNext([
 *   new Response("<LineDetection><id>2</id><enabled>true</enabled></LineDetection>"),
 * ]));
 *
 * const line = await read({
 *   baseUrl: "http://192.0.2.21",
 *   username: "admin",
 *   password: "hunter2",
 *   fetch,
 * }, lineDetection({ channel: 2 }));
 *
 * assertEquals(line, { channel: 2, enabled: true, lines: [] });
 * assertEquals(fetch.calls[0].args[0], "http://192.0.2.21/ISAPI/Smart/LineDetection/2");
 * ```
 *
 * @example A device without the feature
 * ```ts
 * import { assertThrows } from "@std/assert";
 * import { IsapiError } from "../status.ts";
 * import { lineDetection } from "./line-detection.ts";
 *
 * assertThrows(
 *   () =>
 *     lineDetection().codec.parse(
 *       "<ResponseStatus><statusCode>4</statusCode>" +
 *         "<subStatusCode>notSupport</subStatusCode></ResponseStatus>",
 *     ),
 *   IsapiError,
 * );
 * ```
 */
export function lineDetection(
  options: { channel?: number } = {},
): Resource<LineDetection> {
  return {
    path: `/ISAPI/Smart/LineDetection/${options.channel ?? 1}`,
    codec: lineDetectionCodec,
  };
}

const lineDetectionFields = {
  id: int(),
  enabled: optional(bool()),
  normalizedScreenSize: optional(screenSize),
  LineItemList: list(
    "LineItem",
    obj({
      ...ruleFields,
      directionSensitivity: optional(text()),
      CoordinatesList: optional(points()),
    }),
  ),
};

// A stateless description, shared by every resource.
const lineDetectionCodec = document(lineDetectionFields).map(toLineDetection);

function toLineDetection(
  { id, enabled = false, LineItemList, ...rest }: Decoded<
    typeof lineDetectionFields
  >,
): LineDetection {
  return {
    channel: id,
    enabled,
    ...rest,
    lines: LineItemList.map(({ CoordinatesList = [], ...line }) =>
      toRule(line, CoordinatesList)
    ),
  };
}
