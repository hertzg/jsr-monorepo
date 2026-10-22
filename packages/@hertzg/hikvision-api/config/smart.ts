/**
 * Smart region rules: intrusion, region entrance and exit, loitering and
 * the other VCA rules drawn as polygons.
 *
 * Every rule lives under `/ISAPI/Smart/<type>/<channel>`, where `<channel>`
 * is the video input channel: 1..N on an NVR, 1 on a camera. The region
 * rules share one document layout named after the type: a `<RegionEntrance>`
 * root holds a `<RegionEntranceRegionList>` of `<RegionEntranceRegion>`s,
 * and so on for each type, so {@link parseSmartRules} reads any of them.
 * Crossing lines use a different layout, read by `parseLineDetection` in
 * `line-detection.ts`. Every shape is drawn in a normalized screen space,
 * 1000 x 1000 by default. A device without the feature answers a
 * `<ResponseStatus>` with `subStatusCode notSupport`.
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
 * import { parseFieldDetection } from "./smart.ts";
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

import type { XmlElement } from "@std/xml";
import {
  bool,
  type Decoded,
  decodeFields,
  type Field,
  type FieldValue,
  int,
  list,
  obj,
  optional,
  type Point,
  points,
  text,
  tokens,
} from "../isapi/document.ts";
import { type RequestOptions, requestXml } from "../isapi/request.ts";
import { parseIsapi } from "../isapi/status.ts";

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
 * import { SMART_RULE_TYPES } from "./smart.ts";
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
 * The wire fields every region and crossing line share.
 *
 * @example Describe a crossing line with them
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { document, optional, text } from "../isapi/document.ts";
 * import { ruleFields } from "./smart.ts";
 *
 * const line = document({ ...ruleFields, directionSensitivity: optional(text()) });
 *
 * assertEquals(
 *   line.parse("<LineItem><id>2</id><enabled>true</enabled><detectionTarget>human</detectionTarget></LineItem>"),
 *   { id: 2, enabled: true, detectionTarget: ["human"] },
 * );
 * ```
 */
export const ruleFields = {
  id: int(),
  enabled: optional(bool()),
  sensitivityLevel: optional(int()),
  detectionTarget: optional(tokens()),
  alarmConfidence: optional(text()),
};

/**
 * The misinfo filter flags a rule document carries at its root and per region.
 *
 * @example Read the flags of a root
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { document } from "../isapi/document.ts";
 * import { misinfoFilterFields } from "./smart.ts";
 *
 * const flags = document(misinfoFilterFields);
 *
 * assertEquals(
 *   flags.parse("<FieldDetection><humanMisinfoFilterEnabled>true</humanMisinfoFilterEnabled></FieldDetection>"),
 *   { humanMisinfoFilterEnabled: true },
 * );
 * ```
 */
export const misinfoFilterFields = {
  humanMisinfoFilterEnabled: optional(bool()),
  vehicleMisinfoFilterEnabled: optional(bool()),
};

/**
 * The `<normalizedScreenSize>` field, read as its width and height.
 *
 * @example Read the default screen space
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { screenSize } from "./smart.ts";
 *
 * const root = parse(
 *   "<LineDetection><normalizedScreenSize>" +
 *     "<normalizedScreenWidth>1000</normalizedScreenWidth>" +
 *     "<normalizedScreenHeight>1000</normalizedScreenHeight>" +
 *     "</normalizedScreenSize></LineDetection>",
 * ).root;
 *
 * assertEquals(screenSize.decode(root, "normalizedScreenSize"), { width: 1000, height: 1000 });
 * ```
 */
export const screenSize: Field<NormalizedScreenSize> = {
  decode: (parent, name) => {
    const { normalizedScreenWidth: width, normalizedScreenHeight: height } =
      obj({ normalizedScreenWidth: int(), normalizedScreenHeight: int() })
        .decode(parent, name);
    return { width, height };
  },
};

/**
 * Joins decoded {@link ruleFields} with their points into a rule, defaulting
 * `enabled` to `false` and `detectionTarget` to `[]`.
 *
 * @template F The decoded fields, {@link ruleFields} plus any the caller adds.
 * @param fields The decoded fields; extra keys pass through.
 * @param coordinates The shape's points.
 * @returns The rule with its extra keys.
 *
 * @example Map a decoded line item
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { mapRule } from "./smart.ts";
 *
 * const line = mapRule(
 *   { id: 2, sensitivityLevel: 70, directionSensitivity: "any" },
 *   [{ x: 100, y: 500 }, { x: 900, y: 500 }],
 * );
 *
 * assertEquals(line, {
 *   id: 2,
 *   enabled: false,
 *   sensitivityLevel: 70,
 *   directionSensitivity: "any",
 *   coordinates: [{ x: 100, y: 500 }, { x: 900, y: 500 }],
 *   detectionTarget: [],
 * });
 * ```
 */
export function mapRule<F extends Decoded<typeof ruleFields>>(
  fields: F,
  coordinates: Point[],
): F & SmartRule {
  // decodeFields leaves an absent optional field out entirely, so the
  // defaults survive the spread.
  return { enabled: false, detectionTarget: [], ...fields, coordinates };
}

/**
 * The path of a region rule document.
 *
 * @param rule The rule's path segment and video channel; the channel defaults to `1`.
 * @returns The ISAPI path.
 *
 * @example Loitering on an NVR's third channel
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { smartRulesPath } from "./smart.ts";
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
 * import { fieldDetectionPath } from "./smart.ts";
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
 * @throws {IsapiError} When the request fails: a status outside 2xx, or a failing `<ResponseStatus>` on any status.
 *
 * @example Parse a region entrance rule
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseSmartRules } from "./smart.ts";
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
  return decodeSmartRules(parseIsapi(xml));
}

/**
 * Parses a `<FieldDetection>` document.
 *
 * @param xml The document text.
 * @returns The rule and its regions.
 * @throws {IsapiError} When the request fails: a status outside 2xx, or a failing `<ResponseStatus>` on any status.
 *
 * @example A device without the feature
 * ```ts
 * import { assertThrows } from "@std/assert";
 * import { IsapiError } from "../isapi/status.ts";
 * import { parseFieldDetection } from "./smart.ts";
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
 * @throws {IsapiError} When the request fails: a status outside 2xx, or a failing `<ResponseStatus>` on any status.
 *
 * @example Read through a stubbed fetch
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { resolvesNext, spy } from "@std/testing/mock";
 * import { readSmartRules } from "./smart.ts";
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
  return decodeSmartRules(await requestXml(options, smartRulesPath(rule)));
}

/**
 * Reads a field detection document from a device.
 *
 * @param options Where the device is and how to log in.
 * @param channel The video channel. Defaults to `1`.
 * @returns The rule and its regions.
 * @throws {IsapiError} When the request fails: a status outside 2xx, or a failing `<ResponseStatus>` on any status.
 *
 * @example Read through a stubbed fetch
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { resolvesNext, spy } from "@std/testing/mock";
 * import { readFieldDetection } from "./smart.ts";
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

const rootFields = {
  id: int(),
  enabled: optional(bool()),
  normalizedScreenSize: optional(screenSize),
  ...misinfoFilterFields,
};

const region = obj({
  ...ruleFields,
  ...misinfoFilterFields,
  timeThreshold: optional(int()),
  objectOccupation: optional(int()),
  RegionCoordinatesList: optional(points()),
});

function decodeSmartRules(root: XmlElement): SmartRules {
  const type = root.name.local;
  const { id, enabled = false, ...rest } = decodeFields(rootFields, root);
  return {
    type,
    channel: id,
    enabled,
    ...rest,
    regions: list(`${type}Region`, region)
      .decode(root, `${type}RegionList`)
      .map(mapRegion),
  };
}

function mapRegion(
  {
    timeThreshold,
    objectOccupation,
    RegionCoordinatesList = [],
    ...rule
  }: FieldValue<typeof region>,
): SmartRegion {
  return {
    ...mapRule(rule, RegionCoordinatesList),
    ...(timeThreshold !== undefined && { timeThresholdSec: timeThreshold }),
    ...(objectOccupation !== undefined &&
      { objectOccupationPercent: objectOccupation }),
  };
}
