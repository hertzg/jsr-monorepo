/**
 * A document codec from a record of fields.
 *
 * Describes an ISAPI document once; the description reads it. The record
 * is keyed by element name, so it is also the list of elements the reader
 * depends on. Names match by local name, so `xmlns` never matters.
 *
 * @module
 */

import { type Decoded, decodeFields, type Fields } from "./decode-fields.ts";
import { defineDocument, type Document } from "./define-document.ts";

/**
 * Describes a document by its root's fields.
 *
 * @template F The fields.
 * @param fields The fields, keyed by element name.
 * @returns The document codec.
 *
 * @example Describe and read a document
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { document } from "./document.ts";
 * import { optional } from "./optional.ts";
 * import { text } from "./text.ts";
 *
 * const time = document({ timeMode: text(), localTime: text(), platformType: optional(text()) });
 *
 * assertEquals(
 *   time.parse(
 *     '<Time xmlns="http://www.hikvision.com/ver20/XMLSchema">' +
 *       "<timeMode>NTP</timeMode><localTime>2026-10-22T11:33:52+04:00</localTime></Time>",
 *   ),
 *   { timeMode: "NTP", localTime: "2026-10-22T11:33:52+04:00" },
 * );
 * ```
 *
 * @example Map a list document to its items
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { document } from "./document.ts";
 * import { int } from "./int.ts";
 * import { obj } from "./obj.ts";
 * import { repeated } from "./repeated.ts";
 * import { text } from "./text.ts";
 *
 * const channels = document({ InputProxyChannel: repeated(obj({ id: int(), name: text() })) })
 *   .map((root) => root.InputProxyChannel);
 *
 * assertEquals(
 *   channels.parse(
 *     "<InputProxyChannelList><InputProxyChannel><id>1</id><name>Camera 01</name>" +
 *       "</InputProxyChannel></InputProxyChannelList>",
 *   ),
 *   [{ id: 1, name: "Camera 01" }],
 * );
 * ```
 */
export function document<const F extends Fields>(
  fields: F,
): Document<Decoded<F>> {
  return defineDocument((root) => decodeFields(fields, root));
}
