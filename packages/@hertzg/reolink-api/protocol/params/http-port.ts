/**
 * `<HttpPort>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<HttpPort>`. Placeholder: no fields yet. */
export type HttpPort = Record<PropertyKey, never>;

/** Codec for `<HttpPort>`. Placeholder: no fields yet. */
export const httpPort: XmlParam<"HttpPort", HttpPort> = xmlParam(
  "HttpPort",
  {},
);
