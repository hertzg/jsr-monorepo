/**
 * `<upgradeState>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<upgradeState>`. Placeholder: no fields yet. */
export type UpgradeState = Record<PropertyKey, never>;

/** Codec for `<upgradeState>`. Placeholder: no fields yet. */
export const upgradeState: XmlParam<"upgradeState", UpgradeState> = xmlParam(
  "upgradeState",
  {},
);
