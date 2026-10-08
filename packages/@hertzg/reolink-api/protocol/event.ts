/**
 * Alarm events pushed by the camera (cmd 33).
 *
 * The camera pushes its alarm state for each channel whenever it changes:
 *
 * ```xml
 * <body>
 *   <AlarmEventList>
 *     <AlarmEvent>
 *       <channelId>0</channelId>
 *       <status>MD,visitor</status>
 *       <AItype>people</AItype>
 *     </AlarmEvent>
 *   </AlarmEventList>
 * </body>
 * ```
 *
 * Each push is state, not a happening: `visitor` stays `true` for as long as
 * the camera reports the doorbell as active. Turning a `false` to `true` flip
 * into a "pressed" signal is up to the consumer.
 *
 * @example Parse a doorbell press
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseAlarmEvents } from "@hertzg/reolink-api/protocol/event";
 *
 * const events = parseAlarmEvents(
 *   "<body><AlarmEventList><AlarmEvent>" +
 *     "<channelId>0</channelId><status>visitor</status><AItype>none</AItype>" +
 *     "</AlarmEvent></AlarmEventList></body>",
 * );
 *
 * assertEquals(events, [
 *   { channel: 0, motion: false, visitor: true, tamper: false, ai: [] },
 * ]);
 * ```
 *
 * @module
 */

import { isElement, isText, parse, type XmlElement } from "@std/xml";

/** The alarm state of one channel, as the camera pushed it. */
export type AlarmEvent = {
  /** Zero-based channel number. A standalone camera or doorbell is channel `0`. */
  channel: number;
  /** Motion detected: `MD` in the status. */
  motion: boolean;
  /** Doorbell active: `visitor` in the status. */
  visitor: boolean;
  /** Tamper alarm: `tamper` in the status. */
  tamper: boolean;
  /** AI detections the camera reports, such as `people`, `vehicle` or `dog_cat`. Empty for `none`. */
  ai: string[];
};

/**
 * Reads every `<AlarmEvent>` from a decrypted cmd 33 push.
 *
 * Elements other than `<AlarmEvent>`, such as `<DayNightEvent>`, are ignored,
 * and so is an `<AlarmEvent>` without a `<channelId>`.
 *
 * @param xml The decrypted push body.
 * @returns One {@link AlarmEvent} per `<AlarmEvent>` element, in document order.
 *
 * @example Parse a push with AI detections
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseAlarmEvents } from "@hertzg/reolink-api/protocol/event";
 *
 * const [event] = parseAlarmEvents(
 *   "<body><AlarmEventList><AlarmEvent>" +
 *     "<channelId>0</channelId><status>MD</status>" +
 *     "<AItype>people,vehicle</AItype>" +
 *     "</AlarmEvent></AlarmEventList></body>",
 * );
 *
 * assertEquals(event.motion, true);
 * assertEquals(event.ai, ["people", "vehicle"]);
 * ```
 */
export function parseAlarmEvents(xml: string): AlarmEvent[] {
  const events: AlarmEvent[] = [];
  for (const element of findElements(parse(xml).root, "AlarmEvent")) {
    const channelId = childText(element, "channelId");
    if (channelId === undefined) {
      continue;
    }
    const status = tokens(childText(element, "status"));
    events.push({
      channel: Number(channelId),
      motion: status.includes("MD"),
      visitor: status.includes("visitor"),
      tamper: status.includes("tamper"),
      ai: tokens(childText(element, "AItype")),
    });
  }
  return events;
}

function findElements(element: XmlElement, name: string): XmlElement[] {
  if (element.name.local === name) {
    return [element];
  }
  return element.children.filter(isElement).flatMap((child) =>
    findElements(child, name)
  );
}

function childText(element: XmlElement, name: string): string | undefined {
  const child = element.children.filter(isElement).find((node) =>
    node.name.local === name
  );
  return child?.children.filter(isText).map((node) => node.text).join("");
}

function tokens(list: string | undefined): string[] {
  return (list ?? "").split(",").map((token) => token.trim()).filter((
    token,
  ) => token !== "" && token !== "none");
}
