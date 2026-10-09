/**
 * `<Uid>`: the camera's P2P UID, the identifier the Reolink cloud and apps
 * use to reach it. Sent in the reply to cmd 114.
 *
 * Firmware: netserver builds the reply itself (no libnetpublic serializer)
 * and always writes `uid`. Nothing parses this element.
 *
 * @example Read the cmd 114 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { uid } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<Uid version="1.1"><uid>95270000ABCDEFGH</uid></Uid>',
 * ).root;
 *
 * assertEquals(uid.decode(root).uid, "95270000ABCDEFGH");
 * ```
 *
 * @module
 */

import { text, type XmlParam, xmlParam } from "../xml.ts";

/** The camera's P2P UID in `<Uid>`. */
export type Uid = {
  /** The UID string. */
  uid: string;
};

/**
 * Codec for `<Uid>`.
 *
 * @example Build a `<Uid>` element
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { uid } from "@hertzg/reolink-api/protocol/params";
 *
 * assertEquals(
 *   uid.encode({ uid: "95270000ABCDEFGH" }),
 *   '<Uid version="1.1"><uid>95270000ABCDEFGH</uid></Uid>',
 * );
 * ```
 */
export const uid: XmlParam<"Uid", Uid> = xmlParam("Uid", {
  uid: text(),
});
