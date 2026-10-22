/**
 * Smart region rules: intrusion, region entrance and exit, loitering and
 * the other VCA rules drawn as polygons.
 *
 * Every rule lives under `/ISAPI/Smart/<type>/<channel>`, where `<channel>`
 * is the video input channel: 1..N on an NVR, 1 on a camera. The region
 * rules share one document layout named after the type: a `<RegionEntrance>`
 * root holds a `<RegionEntranceRegionList>` of `<RegionEntranceRegion>`s,
 * and so on for each type, so {@link parseSmartRules} reads any of them.
 * Crossing lines use a different layout and live in
 * `@hertzg/hikvision-api/config/line-detection`. Every shape is drawn in a
 * normalized screen space, 1000 x 1000 by default. A device without the
 * feature answers a `<ResponseStatus>` with `subStatusCode notSupport`.
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
 * The alert stream names the same rules in lower case: {@link SMART_RULE_TYPES}
 * maps each path segment to the `<eventType>` its alerts carry.
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
 * assertEquals(field.channel, 1);
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
  present,
  requireText,
  text,
  tokens,
} from "../xml.ts";
import type { XmlElement } from "@std/xml";

/**
 * The smart rule types by path segment, each mapped to the `<eventType>`
 * its alerts carry on the event stream.
 *
 * `FieldDetection` and `LineDetection` post all-lowercase event types; the
 * rest keep their camel case. Every type but `LineDetection` is a region
 * rule that {@link parseSmartRules} reads.
 *
 * @example Match an alert to its rule type
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { SMART_RULE_TYPES } from "@hertzg/hikvision-api/config/smart";
 *
 * assertEquals(SMART_RULE_TYPES.FieldDetection, "fielddetection");
 * assertEquals(SMART_RULE_TYPES.regionEntrance, "regionEntrance");
 * ```
 */
export const SMART_RULE_TYPES = {
  FieldDetection: "fielddetection",
  LineDetection: "linedetection",
  regionEntrance: "regionEntrance",
  regionExiting: "regionExiting",
  loitering: "loitering",
  group: "group",
  rapidMove: "rapidMove",
  parking: "parking",
  unattendedBaggage: "unattendedBaggage",
  attendedBaggage: "attendedBaggage",
} as const;

/** A region rule's path segment: every key of {@link SMART_RULE_TYPES} but `LineDetection`. */
export type SmartRuleType = Exclude<
  keyof typeof SMART_RULE_TYPES,
  "LineDetection"
>;

/** `<normalizedScreenSize>`: the space the coordinates are drawn in. */
export type NormalizedScreenSize = {
  /** `<normalizedScreenWidth>`, usually `1000`. */
  width: number;
  /** `<normalizedScreenHeight>`, usually `1000`. */
  height: number;
};

/** What a region and a crossing line have in common. */
export type SmartRule = {
  /** `<id>`, from 1. */
  id: number;
  /** `<enabled>`. */
  enabled: boolean;
  /** `<sensitivityLevel>`, 0 to 100. */
  sensitivityLevel?: number;
  /** The shape's points in the normalized screen space. */
  coordinates: Point[];
  /** `<detectionTarget>` split on commas, such as `["human", "vehicle"]`, or `["all"]` on some firmware. */
  detectionTarget: string[];
  /** `<alarmConfidence>`: `low`, `mediumLow`, `mediumHigh` or `high`. */
  alarmConfidence?: string;
};

/** One region of a region rule, such as a `<FieldDetectionRegion>`. */
export type SmartRegion = SmartRule & {
  /** `<timeThreshold>`: seconds inside before the alarm, on `FieldDetection`, `loitering` and `parking`. */
  timeThresholdSec?: number;
  /** `<objectOccupation>`: percent of the region the target must fill, 1 to 100, on `FieldDetection` and `group`. */
  objectOccupationPercent?: number;
  /** `<humanMisinfoFilterEnabled>`: drop false human detections in this region. */
  humanMisinfoFilterEnabled?: boolean;
  /** `<vehicleMisinfoFilterEnabled>`: drop false vehicle detections in this region. */
  vehicleMisinfoFilterEnabled?: boolean;
};

/** The fields of a region rule document, such as `<FieldDetection>`. */
export type SmartRules = {
  /** The root element's local name, such as `FieldDetection` or `RegionEntrance`. */
  type: string;
  /** `<id>`: the video channel the rules apply to. */
  channel: number;
  /** `<enabled>`: whether the rule runs at all. */
  enabled: boolean;
  /** `<normalizedScreenSize>`, when present. */
  normalizedScreenSize?: NormalizedScreenSize;
  /** `<humanMisinfoFilterEnabled>` at the root, when present. */
  humanMisinfoFilterEnabled?: boolean;
  /** `<vehicleMisinfoFilterEnabled>` at the root, when present. */
  vehicleMisinfoFilterEnabled?: boolean;
  /** The regions, in document order. */
  regions: SmartRegion[];
};

/** One `<FieldDetectionRegion>`: a polygon that raises `fielddetection`. */
export type FieldDetectionRegion = SmartRegion;

/** The fields of `<FieldDetection>`, whose `type` is `FieldDetection`. */
export type FieldDetection = SmartRules;

/**
 * The path of a region rule document.
 *
 * @param rule The rule's path segment and video channel; the channel defaults to `1`.
 * @returns The ISAPI path.
 *
 * @example Loitering on an NVR's third channel
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { smartRulesPath } from "@hertzg/hikvision-api/config/smart";
 *
 * assertEquals(smartRulesPath({ type: "loitering", channel: 3 }), "/ISAPI/Smart/loitering/3");
 * assertEquals(smartRulesPath({ type: "FieldDetection" }), "/ISAPI/Smart/FieldDetection/1");
 * ```
 */
export function smartRulesPath(
  rule: { type: SmartRuleType; channel?: number },
): string {
  return `/ISAPI/Smart/${rule.type}/${rule.channel ?? 1}`;
}

/**
 * The path of a field detection document.
 *
 * @param channel The video channel. Defaults to `1`.
 * @returns The ISAPI path.
 *
 * @example The first channel
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { fieldDetectionPath } from "@hertzg/hikvision-api/config/smart";
 *
 * assertEquals(fieldDetectionPath(), "/ISAPI/Smart/FieldDetection/1");
 * ```
 */
export function fieldDetectionPath(channel = 1): string {
  return smartRulesPath({ type: "FieldDetection", channel });
}

/**
 * Parses a region rule document of any type by its root name.
 *
 * @param xml The document text.
 * @returns The rule and its regions.
 * @throws {IsapiError} When the document is a failing `<ResponseStatus>`,
 *   as a device without the feature answers.
 *
 * @example Parse a region entrance rule
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseSmartRules } from "@hertzg/hikvision-api/config/smart";
 *
 * const rules = parseSmartRules(
 *   "<RegionEntrance><id>2</id><enabled>true</enabled>" +
 *     "<RegionEntranceRegionList><RegionEntranceRegion><id>1</id><enabled>true</enabled>" +
 *     "<sensitivityLevel>50</sensitivityLevel><RegionCoordinatesList>" +
 *     "<RegionCoordinates><positionX>0</positionX><positionY>0</positionY></RegionCoordinates>" +
 *     "<RegionCoordinates><positionX>1000</positionX><positionY>0</positionY></RegionCoordinates>" +
 *     "<RegionCoordinates><positionX>500</positionX><positionY>1000</positionY></RegionCoordinates>" +
 *     "</RegionCoordinatesList><detectionTarget>all</detectionTarget>" +
 *     "</RegionEntranceRegion></RegionEntranceRegionList></RegionEntrance>",
 * );
 *
 * assertEquals(rules, {
 *   type: "RegionEntrance",
 *   channel: 2,
 *   enabled: true,
 *   regions: [{
 *     id: 1,
 *     enabled: true,
 *     sensitivityLevel: 50,
 *     coordinates: [{ x: 0, y: 0 }, { x: 1000, y: 0 }, { x: 500, y: 1000 }],
 *     detectionTarget: ["all"],
 *   }],
 * });
 * ```
 */
export function parseSmartRules(xml: string): SmartRules {
  return smartRules(parseIsapi(xml));
}

/**
 * Parses a `<FieldDetection>` document.
 *
 * @param xml The document text.
 * @returns The rule and its regions.
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
  return parseSmartRules(xml);
}

/**
 * Reads a region rule document of any type from a device.
 *
 * @param options Where the device is and how to log in.
 * @param rule The rule's path segment and video channel; the channel defaults to `1`.
 * @returns The rule and its regions.
 * @throws {HttpError} When the device answers with a status outside 2xx.
 * @throws {IsapiError} When the device answers a failing `<ResponseStatus>`.
 *
 * @example Read through a stubbed fetch
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { resolvesNext, spy } from "@std/testing/mock";
 * import { readSmartRules } from "@hertzg/hikvision-api/config/smart";
 *
 * const fetch = spy(resolvesNext([
 *   new Response("<Loitering><id>4</id><enabled>false</enabled></Loitering>"),
 * ]));
 *
 * const rules = await readSmartRules({
 *   baseUrl: "http://192.0.2.10",
 *   username: "admin",
 *   password: "hunter2",
 *   fetch,
 * }, { type: "loitering", channel: 4 });
 *
 * assertEquals(rules, { type: "Loitering", channel: 4, enabled: false, regions: [] });
 * assertEquals(fetch.calls[0].args[0], "http://192.0.2.10/ISAPI/Smart/loitering/4");
 * ```
 */
export async function readSmartRules(
  options: RequestOptions,
  rule: { type: SmartRuleType; channel?: number },
): Promise<SmartRules> {
  return smartRules(await requestXml(options, smartRulesPath(rule)));
}

/**
 * Reads a field detection document from a device.
 *
 * @param options Where the device is and how to log in.
 * @param channel The video channel. Defaults to `1`.
 * @returns The rule and its regions.
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
 * assertEquals(field, { type: "FieldDetection", channel: 1, enabled: false, regions: [] });
 * assertEquals(fetch.calls[0].args[0], "http://192.0.2.21/ISAPI/Smart/FieldDetection/1");
 * ```
 */
export function readFieldDetection(
  options: RequestOptions,
  channel = 1,
): Promise<FieldDetection> {
  return readSmartRules(options, { type: "FieldDetection", channel });
}

/**
 * Reads the fields every region and crossing line share from its element.
 *
 * @param entry The `<…Region>` or `<LineItem>` element.
 * @param coordinatesListName The local name of its coordinate list, such as `RegionCoordinatesList`.
 * @returns The id, enabled flag, sensitivity, points, targets and confidence.
 *
 * @example Read a line item's common fields
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { parseSmartRule } from "@hertzg/hikvision-api/config/smart";
 *
 * const item = parse(
 *   "<LineItem><id>2</id><enabled>true</enabled><sensitivityLevel>70</sensitivityLevel>" +
 *     "<CoordinatesList>" +
 *     "<Coordinates><positionX>100</positionX><positionY>500</positionY></Coordinates>" +
 *     "<Coordinates><positionX>900</positionX><positionY>500</positionY></Coordinates>" +
 *     "</CoordinatesList><detectionTarget>human,vehicle</detectionTarget></LineItem>",
 * ).root;
 *
 * assertEquals(parseSmartRule(item, "CoordinatesList"), {
 *   id: 2,
 *   enabled: true,
 *   sensitivityLevel: 70,
 *   coordinates: [{ x: 100, y: 500 }, { x: 900, y: 500 }],
 *   detectionTarget: ["human", "vehicle"],
 * });
 * ```
 */
export function parseSmartRule(
  entry: XmlElement,
  coordinatesListName: string,
): SmartRule {
  const list = element(entry, coordinatesListName);
  return {
    id: Number(requireText(entry, "id")),
    enabled: text(entry, "enabled") === "true",
    coordinates: list === undefined ? [] : points(list),
    detectionTarget: tokens(text(entry, "detectionTarget")),
    ...present({
      sensitivityLevel: numberText(entry, "sensitivityLevel"),
      alarmConfidence: text(entry, "alarmConfidence"),
    }),
  };
}

/**
 * Reads the `<normalizedScreenSize>` under a rule document's root.
 *
 * @param root The rule document's root element.
 * @returns The width and height, or `undefined` when the element is missing.
 *
 * @example Read the default screen space
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { parseNormalizedScreenSize } from "@hertzg/hikvision-api/config/smart";
 *
 * const root = parse(
 *   "<LineDetection><normalizedScreenSize>" +
 *     "<normalizedScreenWidth>1000</normalizedScreenWidth>" +
 *     "<normalizedScreenHeight>1000</normalizedScreenHeight>" +
 *     "</normalizedScreenSize></LineDetection>",
 * ).root;
 *
 * assertEquals(parseNormalizedScreenSize(root), { width: 1000, height: 1000 });
 * assertEquals(parseNormalizedScreenSize(parse("<Loitering />").root), undefined);
 * ```
 */
export function parseNormalizedScreenSize(
  root: XmlElement,
): NormalizedScreenSize | undefined {
  const size = element(root, "normalizedScreenSize");
  if (size === undefined) {
    return undefined;
  }
  return {
    width: Number(requireText(size, "normalizedScreenWidth")),
    height: Number(requireText(size, "normalizedScreenHeight")),
  };
}

function smartRules(root: XmlElement): SmartRules {
  const type = root.name.local;
  const list = element(root, `${type}RegionList`);
  return {
    type,
    channel: Number(requireText(root, "id")),
    enabled: text(root, "enabled") === "true",
    ...present({ normalizedScreenSize: parseNormalizedScreenSize(root) }),
    ...misinfoFilters(root),
    regions: list === undefined
      ? []
      : elements(list, `${type}Region`).map((entry) => ({
        ...parseSmartRule(entry, "RegionCoordinatesList"),
        ...present({
          timeThresholdSec: numberText(entry, "timeThreshold"),
          objectOccupationPercent: numberText(entry, "objectOccupation"),
        }),
        ...misinfoFilters(entry),
      })),
  };
}

function misinfoFilters(parent: XmlElement): {
  humanMisinfoFilterEnabled?: boolean;
  vehicleMisinfoFilterEnabled?: boolean;
} {
  return present({
    humanMisinfoFilterEnabled: booleanText(parent, "humanMisinfoFilterEnabled"),
    vehicleMisinfoFilterEnabled: booleanText(
      parent,
      "vehicleMisinfoFilterEnabled",
    ),
  });
}

function numberText(parent: XmlElement, name: string): number | undefined {
  const value = text(parent, name);
  return value === undefined ? undefined : Number(value);
}

function booleanText(parent: XmlElement, name: string): boolean | undefined {
  const value = text(parent, name);
  return value === undefined ? undefined : value === "true";
}
