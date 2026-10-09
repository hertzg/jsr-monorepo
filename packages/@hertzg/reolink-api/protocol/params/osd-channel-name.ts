/**
 * `<OsdChannelName>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<OsdChannelName>`. Placeholder: no fields yet. */
export type OsdChannelName = Record<PropertyKey, never>;

/** Codec for `<OsdChannelName>`. Placeholder: no fields yet. */
export const osdChannelName: XmlParam<"OsdChannelName", OsdChannelName> =
  xmlParam(
    "OsdChannelName",
    {},
  );
