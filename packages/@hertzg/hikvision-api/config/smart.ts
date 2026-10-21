/**
 * Smart rules: intrusion regions and crossing lines.
 *
 * `/ISAPI/Smart/FieldDetection/<id>` holds the regions whose entry raises
 * `fielddetection`; `/ISAPI/Smart/LineDetection/<id>` the lines whose
 * crossing raises `linedetection`. Both draw in a normalized screen space,
 * 1000 x 1000 by default, and both list a `<detectionTarget>` and an
 * `<alarmConfidence>` on newer firmware. A device without the feature
 * answers a `<ResponseStatus>` with `subStatusCode notSupport`.
 *
 * ```xml
 * <FieldDetection version="2.0" xmlns="http://www.hikvision.com/ver20/XMLSchema">
 * <id>1</id>
 * <enabled>true</enabled>
 * <normalizedScreenSize>
 * <normalizedScreenWidth>1000</normalizedScreenWidth>
 * <normalizedScreenHeight>1000</normalizedScreenHeight>
 * </normalizedScreenSize>
 * <FieldDetectionRegionList size="4">
 * <FieldDetectionRegion>
 * <id>1</id>
 * <enabled>false</enabled>
 * <sensitivityLevel>45</sensitivityLevel>
 * <timeThreshold>0</timeThreshold>
 * <RegionCoordinatesList>
 * <RegionCoordinates><positionX>654</positionX><positionY>792</positionY></RegionCoordinates>
 * …
 * </RegionCoordinatesList>
 * <detectionTarget>human</detectionTarget>
 * <alarmConfidence opt="low,mediumLow,mediumHigh,high">low</alarmConfidence>
 * </FieldDetectionRegion>
 * </FieldDetectionRegionList>
 * </FieldDetection>
 * ```
 *
 * @example Parse an intrusion region
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseFieldDetection } from "@hertzg/hikvision-api/config/smart";
 *
 * const field = parseFieldDetection(
 *   "<FieldDetection><id>1</id><enabled>true</enabled>" +
 *     "<FieldDetectionRegionList><FieldDetectionRegion><id>1</id><enabled>false</enabled>" +
 *     "<sensitivityLevel>45</sensitivityLevel><RegionCoordinatesList>" +
 *     "<RegionCoordinates><positionX>0</positionX><positionY>0</positionY></RegionCoordinates>" +
 *     "<RegionCoordinates><positionX>1000</positionX><positionY>0</positionY></RegionCoordinates>" +
 *     "<RegionCoordinates><positionX>500</positionX><positionY>1000</positionY></RegionCoordinates>" +
 *     "</RegionCoordinatesList><detectionTarget>human</detectionTarget>" +
 *     "</FieldDetectionRegion></FieldDetectionRegionList></FieldDetection>",
 * );
 *
 * assertEquals(field.regions, [{
 *   id: 1,
 *   enabled: false,
 *   sensitivityLevel: 45,
 *   coordinates: [{ x: 0, y: 0 }, { x: 1000, y: 0 }, { x: 500, y: 1000 }],
 *   detectionTarget: ["human"],
 * }]);
 * ```
 *
 * @module
 */

import { type RequestOptions, requestXml } from "../request.ts";
import {
  element,
  elements,
  parseIsapi,
  type Point,
  points,
  requireText,
  text,
  tokens,
} from "../xml.ts";
import type { XmlElement } from "@std/xml";

/** `<normalizedScreenSize>`: the space the coordinates are drawn in. */
export type NormalizedScreenSize = {
  /** `<normalizedScreenWidth>`, usually `1000`. */
  width: number;
  /** `<normalizedScreenHeight>`, usually `1000`. */
  height: number;
};

/** What a region or line has in common. */
export type SmartRule = {
  /** `<id>`, from 1. */
  id: number;
  /** `<enabled>`. */
  enabled: boolean;
  /** `<sensitivityLevel>`, 0 to 100. */
  sensitivityLevel?: number;
  /** The shape's points in the normalized screen space. */
  coordinates: Point[];
  /** `<detectionTarget>` split on commas, such as `["human", "vehicle"]`. */
  detectionTarget: string[];
  /** `<alarmConfidence>`: `low`, `mediumLow`, `mediumHigh` or `high`. */
  alarmConfidence?: string;
};

/** One `<FieldDetectionRegion>`: a polygon that raises `fielddetection`. */
export type FieldDetectionRegion = SmartRule & {
  /** `<timeThreshold>`: seconds inside before the alarm, when present. */
  timeThreshold?: number;
};

/** The fields of `<FieldDetection>`. */
export type FieldDetection = {
  /** `<id>`, the rule set number. */
  id: number;
  /** `<enabled>`: whether intrusion detection runs at all. */
  enabled: boolean;
  /** `<normalizedScreenSize>`, when present. */
  normalizedScreenSize?: NormalizedScreenSize;
  /** The regions, in document order. */
  regions: FieldDetectionRegion[];
};

/** One `<LineItem>`: a line whose crossing raises `linedetection`. */
export type LineDetectionLine = SmartRule & {
  /** `<directionSensitivity>`: `any`, `left-right` or `right-left`, when present. */
  directionSensitivity?: string;
};

/** The fields of `<LineDetection>`. */
export type LineDetection = {
  /** `<id>`, the rule set number. */
  id: number;
  /** `<enabled>`: whether line crossing detection runs at all. */
  enabled: boolean;
  /** `<normalizedScreenSize>`, when present. */
  normalizedScreenSize?: NormalizedScreenSize;
  /** The lines, in document order. */
  lines: LineDetectionLine[];
};

/**
 * The path of a field detection document.
 *
 * @param id The rule set number. Defaults to `1`.
 * @returns The ISAPI path.
 *
 * @example The default rule set
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { fieldDetectionPath } from "@hertzg/hikvision-api/config/smart";
 *
 * assertEquals(fieldDetectionPath(), "/ISAPI/Smart/FieldDetection/1");
 * ```
 */
export function fieldDetectionPath(id = 1): string {
  return `/ISAPI/Smart/FieldDetection/${id}`;
}

/**
 * The path of a line detection document.
 *
 * @param id The rule set number. Defaults to `1`.
 * @returns The ISAPI path.
 *
 * @example A second rule set
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { lineDetectionPath } from "@hertzg/hikvision-api/config/smart";
 *
 * assertEquals(lineDetectionPath(2), "/ISAPI/Smart/LineDetection/2");
 * ```
 */
export function lineDetectionPath(id = 1): string {
  return `/ISAPI/Smart/LineDetection/${id}`;
}

/**
 * Parses a `<FieldDetection>` document.
 *
 * @param xml The document text.
 * @returns The rule set and its regions.
 * @throws {IsapiError} When the document is a failing `<ResponseStatus>`,
 *   as a device without intrusion detection answers.
 *
 * @example A device without the feature
 * ```ts
 * import { assertThrows } from "@std/assert";
 * import { parseFieldDetection } from "@hertzg/hikvision-api/config/smart";
 * import { IsapiError } from "@hertzg/hikvision-api/xml";
 *
 * assertThrows(
 *   () =>
 *     parseFieldDetection(
 *       "<ResponseStatus><statusCode>4</statusCode>" +
 *         "<subStatusCode>notSupport</subStatusCode></ResponseStatus>",
 *     ),
 *   IsapiError,
 * );
 * ```
 */
export function parseFieldDetection(xml: string): FieldDetection {
  return fieldDetection(parseIsapi(xml));
}

/**
 * Parses a `<LineDetection>` document.
 *
 * @param xml The document text.
 * @returns The rule set and its lines.
 * @throws {IsapiError} When the document is a failing `<ResponseStatus>`.
 *
 * @example Parse a crossing line
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseLineDetection } from "@hertzg/hikvision-api/config/smart";
 *
 * const line = parseLineDetection(
 *   "<LineDetection><id>1</id><enabled>true</enabled><LineItemList size=\"1\" >" +
 *     "<LineItem><id>1</id><enabled>true</enabled><directionSensitivity>any</directionSensitivity>" +
 *     "<CoordinatesList>" +
 *     "<Coordinates><positionX>100</positionX><positionY>500</positionY></Coordinates>" +
 *     "<Coordinates><positionX>900</positionX><positionY>500</positionY></Coordinates>" +
 *     "</CoordinatesList><detectionTarget>human,vehicle</detectionTarget>" +
 *     "<alarmConfidence opt=\"low,mediumLow,mediumHigh,high\">low</alarmConfidence>" +
 *     "</LineItem></LineItemList></LineDetection>",
 * );
 *
 * assertEquals(line.lines, [{
 *   id: 1,
 *   enabled: true,
 *   directionSensitivity: "any",
 *   coordinates: [{ x: 100, y: 500 }, { x: 900, y: 500 }],
 *   detectionTarget: ["human", "vehicle"],
 *   alarmConfidence: "low",
 * }]);
 * ```
 */
export function parseLineDetection(xml: string): LineDetection {
  return lineDetection(parseIsapi(xml));
}

/**
 * Reads a field detection document from a device.
 *
 * @param options Where the device is and how to log in.
 * @param id The rule set number. Defaults to `1`.
 * @returns The rule set and its regions.
 * @throws {HttpError} When the device answers with a status outside 2xx.
 * @throws {IsapiError} When the device answers a failing `<ResponseStatus>`.
 *
 * @example Read through a stubbed fetch
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { resolvesNext, spy } from "@std/testing/mock";
 * import { readFieldDetection } from "@hertzg/hikvision-api/config/smart";
 *
 * const fetch = spy(resolvesNext([
 *   new Response("<FieldDetection><id>1</id><enabled>false</enabled></FieldDetection>"),
 * ]));
 *
 * const field = await readFieldDetection({
 *   baseUrl: "http://192.0.2.21",
 *   username: "admin",
 *   password: "hunter2",
 *   fetch,
 * });
 *
 * assertEquals(field, { id: 1, enabled: false, regions: [] });
 * assertEquals(fetch.calls[0].args[0], "http://192.0.2.21/ISAPI/Smart/FieldDetection/1");
 * ```
 */
export async function readFieldDetection(
  options: RequestOptions,
  id = 1,
): Promise<FieldDetection> {
  return fieldDetection(await requestXml(options, fieldDetectionPath(id)));
}

/**
 * Reads a line detection document from a device.
 *
 * @param options Where the device is and how to log in.
 * @param id The rule set number. Defaults to `1`.
 * @returns The rule set and its lines.
 * @throws {HttpError} When the device answers with a status outside 2xx.
 * @throws {IsapiError} When the device answers a failing `<ResponseStatus>`.
 *
 * @example Read through a stubbed fetch
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { resolvesNext, spy } from "@std/testing/mock";
 * import { readLineDetection } from "@hertzg/hikvision-api/config/smart";
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
 * assertEquals(line, { id: 1, enabled: true, lines: [] });
 * assertEquals(fetch.calls[0].args[0], "http://192.0.2.21/ISAPI/Smart/LineDetection/1");
 * ```
 */
export async function readLineDetection(
  options: RequestOptions,
  id = 1,
): Promise<LineDetection> {
  return lineDetection(await requestXml(options, lineDetectionPath(id)));
}

function fieldDetection(root: XmlElement): FieldDetection {
  const field: FieldDetection = {
    id: Number(requireText(root, "id")),
    enabled: text(root, "enabled") === "true",
    regions: [],
  };
  const size = screenSize(root);
  if (size !== undefined) {
    field.normalizedScreenSize = size;
  }
  const list = element(root, "FieldDetectionRegionList");
  if (list !== undefined) {
    field.regions = elements(list, "FieldDetectionRegion").map((entry) => {
      const region: FieldDetectionRegion = rule(entry, "RegionCoordinatesList");
      const timeThreshold = text(entry, "timeThreshold");
      if (timeThreshold !== undefined) {
        region.timeThreshold = Number(timeThreshold);
      }
      return region;
    });
  }
  return field;
}

function lineDetection(root: XmlElement): LineDetection {
  const line: LineDetection = {
    id: Number(requireText(root, "id")),
    enabled: text(root, "enabled") === "true",
    lines: [],
  };
  const size = screenSize(root);
  if (size !== undefined) {
    line.normalizedScreenSize = size;
  }
  const list = element(root, "LineItemList");
  if (list !== undefined) {
    line.lines = elements(list, "LineItem").map((entry) => {
      const item: LineDetectionLine = rule(entry, "CoordinatesList");
      const direction = text(entry, "directionSensitivity");
      if (direction !== undefined) {
        item.directionSensitivity = direction;
      }
      return item;
    });
  }
  return line;
}

function rule(entry: XmlElement, listName: string): SmartRule {
  const list = element(entry, listName);
  const shape: SmartRule = {
    id: Number(requireText(entry, "id")),
    enabled: text(entry, "enabled") === "true",
    coordinates: list === undefined ? [] : points(list),
    detectionTarget: tokens(text(entry, "detectionTarget")),
  };
  const sensitivityLevel = text(entry, "sensitivityLevel");
  if (sensitivityLevel !== undefined) {
    shape.sensitivityLevel = Number(sensitivityLevel);
  }
  const alarmConfidence = text(entry, "alarmConfidence");
  if (alarmConfidence !== undefined) {
    shape.alarmConfidence = alarmConfidence;
  }
  return shape;
}

function screenSize(root: XmlElement): NormalizedScreenSize | undefined {
  const size = element(root, "normalizedScreenSize");
  if (size === undefined) {
    return undefined;
  }
  return {
    width: Number(requireText(size, "normalizedScreenWidth")),
    height: Number(requireText(size, "normalizedScreenHeight")),
  };
}
