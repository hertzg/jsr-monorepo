/**
 * `<NetworkDiagnosisData>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<NetworkDiagnosisData>`. Placeholder: no fields yet. */
export type NetworkDiagnosisData = Record<PropertyKey, never>;

/** Codec for `<NetworkDiagnosisData>`. Placeholder: no fields yet. */
export const networkDiagnosisData: XmlParam<
  "NetworkDiagnosisData",
  NetworkDiagnosisData
> = xmlParam(
  "NetworkDiagnosisData",
  {},
);
