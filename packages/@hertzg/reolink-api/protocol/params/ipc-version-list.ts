/**
 * `<IpcVersionList>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<IpcVersionList>`. Placeholder: no fields yet. */
export type IpcVersionList = Record<PropertyKey, never>;

/** Codec for `<IpcVersionList>`. Placeholder: no fields yet. */
export const ipcVersionList: XmlParam<"IpcVersionList", IpcVersionList> =
  xmlParam(
    "IpcVersionList",
    {},
  );
