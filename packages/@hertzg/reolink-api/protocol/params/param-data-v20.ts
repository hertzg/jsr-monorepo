/**
 * `<PARAM_DATA_V20>`: the slot for a message's raw binary payload, named by
 * cmd 67 (`UPDATE_DEVICE`), cmd 202 (`TALK_FDX_STREAM_V20`), cmd 261
 * (`IMPORT_AUDIO_V20`) and cmd 420 (`IMPORT_IMAGE_V20`).
 *
 * Firmware: no function reads or writes this as XML. When a request's
 * extension marks binary data, the `netserver` dispatcher copies the bytes
 * after the extension straight into parameter 5201, the id registered under
 * this name. The bytes travel outside `<body>`, so the element has no fields
 * and this codec carries nothing.
 *
 * @example Read an empty element
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { paramDataV20 } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse('<PARAM_DATA_V20 version="1.1"></PARAM_DATA_V20>').root;
 *
 * assertEquals(paramDataV20.decode(root), {});
 * ```
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<PARAM_DATA_V20>`: none, the payload is raw bytes. */
export type ParamDataV20 = Record<PropertyKey, never>;

/**
 * Codec for `<PARAM_DATA_V20>`. It has no fields: the payload it names is
 * binary and is not part of the XML body.
 *
 * @example Build the element
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { paramDataV20 } from "@hertzg/reolink-api/protocol/params";
 *
 * assertEquals(
 *   paramDataV20.encode({}),
 *   '<PARAM_DATA_V20 version="1.1"></PARAM_DATA_V20>',
 * );
 * ```
 */
export const paramDataV20: XmlParam<"PARAM_DATA_V20", ParamDataV20> = xmlParam(
  "PARAM_DATA_V20",
  {},
);
