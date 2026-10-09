/**
 * `<certificateInfo>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<certificateInfo>`. Placeholder: no fields yet. */
export type CertificateInfo = Record<PropertyKey, never>;

/** Codec for `<certificateInfo>`. Placeholder: no fields yet. */
export const certificateInfo: XmlParam<"certificateInfo", CertificateInfo> =
  xmlParam(
    "certificateInfo",
    {},
  );
