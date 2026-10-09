/**
 * `<StreamInfoList>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<StreamInfoList>`. Placeholder: no fields yet. */
export type StreamInfoList = Record<PropertyKey, never>;

/** Codec for `<StreamInfoList>`. Placeholder: no fields yet. */
export const streamInfoList: XmlParam<"StreamInfoList", StreamInfoList> =
  xmlParam(
    "StreamInfoList",
    {},
  );
