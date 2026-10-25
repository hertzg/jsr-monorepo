/**
 * Field detection (intrusion): polygons that raise `fielddetection` alerts.
 *
 * The document lives at `/ISAPI/Smart/FieldDetection/<channel>` and is read
 * as any other region rule by `smartRules` in `smart-rules.ts`.
 *
 * @module
 */

import type { Resource } from "../request.ts";
import {
  type SmartRegion,
  type SmartRules,
  smartRules,
} from "./smart-rules.ts";

/** One `<FieldDetectionRegion>`: a polygon that raises `fielddetection`. */
export type FieldDetectionRegion = SmartRegion;

/** The fields of `<FieldDetection>`, whose `type` is `FieldDetection`. */
export type FieldDetection = SmartRules;

/**
 * The field detection (intrusion) document of one channel.
 *
 * @param options Which channel; defaults to `1`.
 * @returns The resource: its path and the codec that reads it.
 *
 * @example A device without the feature
 * ```ts
 * import { assertEquals, assertThrows } from "@std/assert";
 * import { IsapiError } from "../status/isapi-error.ts";
 * import { fieldDetection } from "./field-detection.ts";
 *
 * assertEquals(fieldDetection({ channel: 2 }).path, "/ISAPI/Smart/FieldDetection/2");
 * assertThrows(
 *   () =>
 *     fieldDetection().codec.parse(
 *       "<ResponseStatus><statusCode>4</statusCode>" +
 *         "<subStatusCode>notSupport</subStatusCode></ResponseStatus>",
 *     ),
 *   IsapiError,
 * );
 * ```
 */
export function fieldDetection(
  options: { channel?: number } = {},
): Resource<FieldDetection> {
  return smartRules({ type: "FieldDetection", ...options });
}
