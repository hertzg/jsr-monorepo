/**
 * `<ZoomFocusInfo>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<ZoomFocusInfo>`. Placeholder: no fields yet. */
export type ZoomFocusInfo = Record<PropertyKey, never>;

/** Codec for `<ZoomFocusInfo>`. Placeholder: no fields yet. */
export const zoomFocusInfo: XmlParam<"ZoomFocusInfo", ZoomFocusInfo> = xmlParam(
  "ZoomFocusInfo",
  {},
);
