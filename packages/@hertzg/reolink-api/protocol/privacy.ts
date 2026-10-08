/**
 * Privacy mode, which Reolink also calls sleep: the camera stops recording
 * and streaming until it is turned off again.
 *
 * ```
 * cmd 575, privacyModeXml(true)  ->  empty status-200 reply
 * cmd 574, no body               ->  <sleepState><sleep>1</sleep></sleepState>
 * ```
 *
 * Both requests address the channel through the message extension.
 *
 * @example Turn privacy mode on, then read it back
 * ```ts
 * import { assertEquals, assertStringIncludes } from "@std/assert";
 * import {
 *   parsePrivacyMode,
 *   privacyModeXml,
 * } from "@hertzg/reolink-api/protocol/privacy";
 *
 * assertStringIncludes(privacyModeXml(true), "<sleep>1</sleep>");
 * assertEquals(
 *   parsePrivacyMode("<body><sleepState><sleep>1</sleep></sleepState></body>"),
 *   true,
 * );
 * ```
 *
 * @module
 */

import { isElement, isText, parse, type XmlElement } from "@std/xml";

/**
 * Builds the body of a request that turns privacy mode on or off.
 *
 * @param enabled `true` to turn privacy mode on.
 * @returns The request XML, ready to be encrypted.
 *
 * @example Turn privacy mode off
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { privacyModeXml } from "@hertzg/reolink-api/protocol/privacy";
 *
 * assertStringIncludes(privacyModeXml(false), "<sleep>0</sleep>");
 * ```
 */
export function privacyModeXml(enabled: boolean): string {
  return '<?xml version="1.0" encoding="UTF-8" ?>\n' +
    "<body>\n" +
    '<sleepState version="1.1">\n' +
    "<operate>2</operate>\n" +
    `<sleep>${enabled ? 1 : 0}</sleep>\n` +
    "</sleepState>\n" +
    "</body>\n";
}

/**
 * Reads the privacy mode state from the reply to a cmd 574 request.
 *
 * @param xml The decrypted reply body.
 * @returns `true` when privacy mode is on.
 * @throws {Error} When the reply has no `<sleep>` element.
 *
 * @example Read an off state
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parsePrivacyMode } from "@hertzg/reolink-api/protocol/privacy";
 *
 * assertEquals(
 *   parsePrivacyMode("<body><sleepState><sleep>0</sleep></sleepState></body>"),
 *   false,
 * );
 * ```
 */
export function parsePrivacyMode(xml: string): boolean {
  const sleep = findElement(parse(xml).root, "sleep");
  if (sleep === undefined) {
    throw new Error("Baichuan privacy mode reply has no <sleep> element");
  }
  return sleep.children.filter(isText).map((node) => node.text).join("")
    .trim() === "1";
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
