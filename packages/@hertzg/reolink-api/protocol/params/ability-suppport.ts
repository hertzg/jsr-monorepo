/**
 * `<AbilitySuppport>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<AbilitySuppport>`. Placeholder: no fields yet. */
export type AbilitySuppport = Record<PropertyKey, never>;

/** Codec for `<AbilitySuppport>`. Placeholder: no fields yet. */
export const abilitySuppport: XmlParam<"AbilitySuppport", AbilitySuppport> =
  xmlParam(
    "AbilitySuppport",
    {},
  );
