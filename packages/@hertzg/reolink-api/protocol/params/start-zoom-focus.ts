/**
 * `<StartZoomFocus>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<StartZoomFocus>`. Placeholder: no fields yet. */
export type StartZoomFocus = Record<PropertyKey, never>;

/** Codec for `<StartZoomFocus>`. Placeholder: no fields yet. */
export const startZoomFocus: XmlParam<"StartZoomFocus", StartZoomFocus> =
  xmlParam(
    "StartZoomFocus",
    {},
  );
