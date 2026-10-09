/**
 * `<ReplaySeek>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<ReplaySeek>`. Placeholder: no fields yet. */
export type ReplaySeek = Record<PropertyKey, never>;

/** Codec for `<ReplaySeek>`. Placeholder: no fields yet. */
export const replaySeek: XmlParam<"ReplaySeek", ReplaySeek> = xmlParam(
  "ReplaySeek",
  {},
);
