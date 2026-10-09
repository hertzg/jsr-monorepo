/**
 * `<FileInfoList>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<FileInfoList>`. Placeholder: no fields yet. */
export type FileInfoList = Record<PropertyKey, never>;

/** Codec for `<FileInfoList>`. Placeholder: no fields yet. */
export const fileInfoList: XmlParam<"FileInfoList", FileInfoList> = xmlParam(
  "FileInfoList",
  {},
);
