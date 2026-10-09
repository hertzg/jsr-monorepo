/**
 * `<FtpTask>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<FtpTask>`. Placeholder: no fields yet. */
export type FtpTask = Record<PropertyKey, never>;

/** Codec for `<FtpTask>`. Placeholder: no fields yet. */
export const ftpTask: XmlParam<"FtpTask", FtpTask> = xmlParam(
  "FtpTask",
  {},
);
