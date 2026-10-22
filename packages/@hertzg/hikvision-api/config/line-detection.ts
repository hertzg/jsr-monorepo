/**
 * Line crossing detection: the lines a target must cross to raise an alert.
 *
 * The document lives at `/ISAPI/Smart/LineDetection/<channel>`, where
 * `<channel>` is the video input channel: 1..N on an NVR, 1 on a camera.
 * Unlike the region rules in `smart.ts`, the root holds a `<LineItemList>`
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
 * import { parseLineDetection } from "./line-detection.ts";
 *
 * const line = parseLineDetection(
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
} from "../isapi/document.ts";
import { readDocument, type RequestOptions } from "../isapi/request.ts";
import {
  mapRule,
  type NormalizedScreenSize,
  ruleFields,
  screenSize,
  type SmartRule,
} from "./smart.ts";

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
 * The path of a line detection document.
 *
 * @param channel The video channel. Defaults to `1`.
 * @returns The ISAPI path.
 *
 * @example An NVR's second channel
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { lineDetectionPath } from "./line-detection.ts";
 *
 * assertEquals(lineDetectionPath(2), "/ISAPI/Smart/LineDetection/2");
 * assertEquals(lineDetectionPath(), "/ISAPI/Smart/LineDetection/1");
 * ```
 */
export function lineDetectionPath(channel = 1): string {
  return `/ISAPI/Smart/LineDetection/${channel}`;
}

/**
 * Parses a `<LineDetection>` document.
 *
 * @param xml The document text.
 * @returns The rule and its lines.
 * @throws {IsapiError} When the document is a failing `<ResponseStatus>`,
 *   as a device without line crossing detection answers.
 *
 * @example A device without the feature
 * ```ts
 * import { assertThrows } from "@std/assert";
 * import { IsapiError } from "../isapi/status.ts";
 * import { parseLineDetection } from "./line-detection.ts";
 *
 * assertThrows(
 *   () =>
 *     parseLineDetection(
 *       "<ResponseStatus><statusCode>4</statusCode>" +
 *         "<subStatusCode>notSupport</subStatusCode></ResponseStatus>",
 *     ),
 *   IsapiError,
 * );
 * ```
 */
export function parseLineDetection(xml: string): LineDetection {
  return mapLineDetection(lineDetection.parse(xml));
}

/**
 * Reads a line detection document from a device.
 *
 * @param options Where the device is and how to log in.
 * @param channel The video channel. Defaults to `1`.
 * @returns The rule and its lines.
 * @throws {HttpError} When the device answers with a status outside 2xx.
 * @throws {IsapiError} When the device answers a failing `<ResponseStatus>`.
 *
 * @example Read through a stubbed fetch
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { resolvesNext, spy } from "@std/testing/mock";
 * import { readLineDetection } from "./line-detection.ts";
 *
 * const fetch = spy(resolvesNext([
 *   new Response("<LineDetection><id>1</id><enabled>true</enabled></LineDetection>"),
 * ]));
 *
 * const line = await readLineDetection({
 *   baseUrl: "http://192.0.2.21",
 *   username: "admin",
 *   password: "hunter2",
 *   fetch,
 * });
 *
 * assertEquals(line, { channel: 1, enabled: true, lines: [] });
 * assertEquals(fetch.calls[0].args[0], "http://192.0.2.21/ISAPI/Smart/LineDetection/1");
 * ```
 */
export async function readLineDetection(
  options: RequestOptions,
  channel = 1,
): Promise<LineDetection> {
  return mapLineDetection(
    await readDocument(options, lineDetectionPath(channel), lineDetection),
  );
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

const lineDetection = document(lineDetectionFields);

function mapLineDetection(
  { id, enabled = false, LineItemList, ...rest }: Decoded<
    typeof lineDetectionFields
  >,
): LineDetection {
  return {
    channel: id,
    enabled,
    ...rest,
    lines: LineItemList.map(({ CoordinatesList = [], ...line }) =>
      mapRule(line, CoordinatesList)
    ),
  };
}
