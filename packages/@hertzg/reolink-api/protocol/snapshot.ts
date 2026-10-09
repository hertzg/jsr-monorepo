/**
 * Snapshot requests (cmd 109): a JPEG of the current frame.
 *
 * The image does not come in the reply. The reply only announces its size,
 * and the image follows in more messages with the same message id:
 *
 * ```
 * cmd 109, snapshotXml   ->  <Snap><pictureSize>48213</pictureSize></Snap>
 *                        ->  payload chunk, payload chunk, ...
 *                        ->  a message with no payload: the image is done
 * ```
 *
 * Each chunk may be partly AES-encrypted, see `decryptPayload` in
 * `@hertzg/reolink-api/protocol/message`.
 *
 * @example Build a request and read the announced size
 * ```ts
 * import { assertEquals, assertStringIncludes } from "@std/assert";
 * import {
 *   parseSnapshotSize,
 *   snapshotXml,
 * } from "@hertzg/reolink-api/protocol/snapshot";
 *
 * assertStringIncludes(
 *   snapshotXml({ channel: 0, stream: "main" }),
 *   "<streamType>main</streamType>",
 * );
 * assertEquals(
 *   parseSnapshotSize("<body><Snap><pictureSize>48213</pictureSize></Snap></body>"),
 *   48213,
 * );
 * ```
 *
 * @module
 */

import { isElement, isText, parse, type XmlElement } from "@std/xml";

/** What {@link snapshotXml} asks for. */
export type SnapshotRequest = {
  /** The zero-based channel number. */
  channel: number;
  /** `main` for full resolution, `sub` for the smaller stream. */
  stream: "main" | "sub";
};

/**
 * Builds the body of a snapshot request.
 *
 * @param request The channel and stream to snapshot.
 * @returns The request XML, ready to be encrypted.
 *
 * @example Snapshot the sub stream of channel 0
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { snapshotXml } from "@hertzg/reolink-api/protocol/snapshot";
 *
 * const xml = snapshotXml({ channel: 0, stream: "sub" });
 *
 * assertStringIncludes(xml, "<channelId>0</channelId>");
 * assertStringIncludes(xml, "<streamType>sub</streamType>");
 * ```
 */
export function snapshotXml(request: SnapshotRequest): string {
  return '<?xml version="1.0" encoding="UTF-8" ?>\n' +
    "<body>\n" +
    '<Snap version="1.1">\n' +
    `<channelId>${request.channel}</channelId>\n` +
    "<logicChannel>0</logicChannel>\n" +
    "<time>0</time>\n" +
    "<fullFrame>0</fullFrame>\n" +
    `<streamType>${request.stream}</streamType>\n` +
    "</Snap>\n" +
    "</body>\n";
}

/**
 * Reads the announced image size from the reply to a snapshot request.
 *
 * @param xml The decrypted reply body.
 * @returns The image size in bytes.
 * @throws {Error} When the reply has no `<pictureSize>` element.
 *
 * @example Read the size
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseSnapshotSize } from "@hertzg/reolink-api/protocol/snapshot";
 *
 * assertEquals(
 *   parseSnapshotSize("<body><Snap><pictureSize>1024</pictureSize></Snap></body>"),
 *   1024,
 * );
 * ```
 */
export function parseSnapshotSize(xml: string): number {
  const size = findElement(parse(xml).root, "pictureSize");
  if (size === undefined) {
    throw new Error("Baichuan snapshot reply has no <pictureSize> element");
  }
  return Number(size.children.filter(isText).map((node) => node.text).join(""));
}

function findElement(
  element: XmlElement,
  name: string,
): XmlElement | undefined {
  if (element.name.local === name) {
    return element;
  }
  for (const child of element.children.filter(isElement)) {
    const found = findElement(child, name);
    if (found !== undefined) {
      return found;
    }
  }
  return undefined;
}
