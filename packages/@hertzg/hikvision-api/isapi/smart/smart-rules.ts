/**
 * Smart region rules: intrusion, region entrance and exit, loitering and
 * the other VCA rules drawn as polygons.
 *
 * Every rule lives under `/ISAPI/Smart/<type>/<channel>`, where `<channel>`
 * is the video input channel: 1..N on an NVR, 1 on a camera. The region
 * rules share one document layout named after the type: a `<RegionEntrance>`
 * root holds a `<RegionEntranceRegionList>` of `<RegionEntranceRegion>`s,
 * and so on for each type, so {@link smartRules} reads any of them.
 * Crossing lines use a different layout, read by `lineDetection` in
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
 * The alert stream names the same rules in lower case: `SMART_RULE_TYPES` in
 * `smart-rule-types.ts` maps each path segment to the `<eventType>` its alerts carry.
 *
 * @example Parse an intrusion region
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { fieldDetection } from "./field-detection.ts";
 *
 * const field = fieldDetection().codec.parse(
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
import { bool } from "../document/bool.ts";
import { children } from "../document/children.ts";
import { decodeFields, type FieldValue } from "../document/decode-fields.ts";
import { defineDocument } from "../document/define-document.ts";
import { int } from "../document/int.ts";
import { list } from "../document/list.ts";
import { obj } from "../document/obj.ts";
import { optional } from "../document/optional.ts";
import { points } from "../document/points.ts";
import type { Resource } from "../request.ts";
import { misinfoFilterFields } from "./misinfo-filter-fields.ts";
import { ruleFields, type SmartRule } from "./rule-fields.ts";
import { type NormalizedScreenSize, screenSize } from "./screen-size.ts";
import type { SmartRuleType } from "./smart-rule-types.ts";
import { toRule } from "./to-rule.ts";

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

/**
 * The region rule document of one type and channel.
 *
 * @param rule The rule's path segment and video channel; the channel defaults to `1`.
 * @returns The resource: its path and the codec that reads any region rule by its root name.
 *
 * @example Loitering on an NVR's third channel
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { smartRules } from "./smart-rules.ts";
 *
 * assertEquals(smartRules({ type: "regionEntrance", channel: 2 }).path, "/ISAPI/Smart/regionEntrance/2");
 * assertEquals(smartRules({ type: "FieldDetection" }).path, "/ISAPI/Smart/FieldDetection/1");
 * ```
 *
 * @example Parse a region entrance rule
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { smartRules } from "./smart-rules.ts";
 *
 * const rules = smartRules({ type: "regionEntrance", channel: 2 }).codec.parse(
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
 *
 * @example Read through a stubbed fetch
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { resolvesNext, spy } from "@std/testing/mock";
 * import { request } from "../request.ts";
 * import { smartRules } from "./smart-rules.ts";
 *
 * const fetch = spy(resolvesNext([
 *   new Response("<Loitering><id>4</id><enabled>false</enabled></Loitering>"),
 * ]));
 *
 * const rules = await request({
 *   baseUrl: "http://192.0.2.10",
 *   username: "admin",
 *   password: "hunter2",
 *   fetch,
 * }, smartRules({ type: "loitering", channel: 4 }));
 *
 * assertEquals(rules, { type: "Loitering", channel: 4, enabled: false, regions: [] });
 * assertEquals(fetch.calls[0].args[0], "http://192.0.2.10/ISAPI/Smart/loitering/4");
 * ```
 */
export function smartRules(
  rule: { type: SmartRuleType; channel?: number },
): Resource<SmartRules> {
  return {
    path: `/ISAPI/Smart/${rule.type}/${rule.channel ?? 1}`,
    codec: smartRulesCodec,
  };
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
      .decodeAll(children(root, `${type}RegionList`))
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
    ...toRule(rule, RegionCoordinatesList),
    ...(timeThreshold !== undefined && { timeThresholdSec: timeThreshold }),
    ...(objectOccupation !== undefined &&
      { objectOccupationPercent: objectOccupation }),
  };
}

// A stateless description, shared by every resource.
const smartRulesCodec = defineDocument(decodeSmartRules);
