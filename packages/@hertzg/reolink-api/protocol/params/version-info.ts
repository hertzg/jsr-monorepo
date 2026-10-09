/**
 * `<VersionInfo>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<VersionInfo>`. Placeholder: no fields yet. */
export type VersionInfo = Record<PropertyKey, never>;

/** Codec for `<VersionInfo>`. Placeholder: no fields yet. */
export const versionInfo: XmlParam<"VersionInfo", VersionInfo> = xmlParam(
  "VersionInfo",
  {},
);
