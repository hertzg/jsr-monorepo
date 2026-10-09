/**
 * `<EmailTask>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<EmailTask>`. Placeholder: no fields yet. */
export type EmailTask = Record<PropertyKey, never>;

/** Codec for `<EmailTask>`. Placeholder: no fields yet. */
export const emailTask: XmlParam<"EmailTask", EmailTask> = xmlParam(
  "EmailTask",
  {},
);
