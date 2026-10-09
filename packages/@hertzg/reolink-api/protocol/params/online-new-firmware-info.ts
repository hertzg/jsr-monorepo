/**
 * `<OnlineNewFirmwareInfo>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<OnlineNewFirmwareInfo>`. Placeholder: no fields yet. */
export type OnlineNewFirmwareInfo = Record<PropertyKey, never>;

/** Codec for `<OnlineNewFirmwareInfo>`. Placeholder: no fields yet. */
export const onlineNewFirmwareInfo: XmlParam<
  "OnlineNewFirmwareInfo",
  OnlineNewFirmwareInfo
> = xmlParam(
  "OnlineNewFirmwareInfo",
  {},
);
