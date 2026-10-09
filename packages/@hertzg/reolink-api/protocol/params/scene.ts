/**
 * `<Scene>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<Scene>`. Placeholder: no fields yet. */
export type Scene = Record<PropertyKey, never>;

/** Codec for `<Scene>`. Placeholder: no fields yet. */
export const scene: XmlParam<"Scene", Scene> = xmlParam(
  "Scene",
  {},
);
