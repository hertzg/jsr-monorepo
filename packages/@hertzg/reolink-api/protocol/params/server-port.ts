/**
 * `<ServerPort>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<ServerPort>`. Placeholder: no fields yet. */
export type ServerPort = Record<PropertyKey, never>;

/** Codec for `<ServerPort>`. Placeholder: no fields yet. */
export const serverPort: XmlParam<"ServerPort", ServerPort> = xmlParam(
  "ServerPort",
  {},
);
