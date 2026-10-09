/**
 * `<HttpsPort>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<HttpsPort>`. Placeholder: no fields yet. */
export type HttpsPort = Record<PropertyKey, never>;

/** Codec for `<HttpsPort>`. Placeholder: no fields yet. */
export const httpsPort: XmlParam<"HttpsPort", HttpsPort> = xmlParam(
  "HttpsPort",
  {},
);
