/**
 * `<ftyImageDetechRet>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<ftyImageDetechRet>`. Placeholder: no fields yet. */
export type FtyImageDetechRet = Record<PropertyKey, never>;

/** Codec for `<ftyImageDetechRet>`. Placeholder: no fields yet. */
export const ftyImageDetechRet: XmlParam<
  "ftyImageDetechRet",
  FtyImageDetechRet
> = xmlParam(
  "ftyImageDetechRet",
  {},
);
