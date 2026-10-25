/**
 * The misinfo filter flags of a smart rule document.
 *
 * @module
 */

import { bool } from "../document/bool.ts";
import { optional } from "../document/optional.ts";

/**
 * The misinfo filter flags a rule document carries at its root and per region.
 *
 * @example Read the flags of a root
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { document } from "../document/document.ts";
 * import { misinfoFilterFields } from "./misinfo-filter-fields.ts";
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
