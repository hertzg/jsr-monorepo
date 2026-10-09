/**
 * `<RequestIframe>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<RequestIframe>`. Placeholder: no fields yet. */
export type RequestIframe = Record<PropertyKey, never>;

/** Codec for `<RequestIframe>`. Placeholder: no fields yet. */
export const requestIframe: XmlParam<"RequestIframe", RequestIframe> = xmlParam(
  "RequestIframe",
  {},
);
