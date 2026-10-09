/**
 * `<LedState>`: the infrared LEDs and the status light. Read with cmd 208,
 * written with cmd 209.
 *
 * Firmware: `nets_led_state_s2x` always writes every field; it writes
 * `auto` for an unknown `state` and fails on an unknown `lightState`.
 * `nets_led_state_x2s` reads each field when present and skips the rest;
 * it rejects a `channelId` above 63 and a `ledVersion` above 2, and ignores
 * an unknown `state` or `lightState`.
 *
 * @example Read the cmd 208 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { ledState } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<LedState version="1.1"><channelId>0</channelId><ledVersion>2</ledVersion>' +
 *     "<state>auto</state><lightState>open</lightState></LedState>",
 * ).root;
 *
 * assertEquals(ledState.decode(root).state, "auto");
 * ```
 *
 * @module
 */

import { int, oneOf, optional, type XmlParam, xmlParam } from "../xml.ts";

/** The LED settings in `<LedState>`. */
export type LedState = {
  /** Zero-based channel, 0 to 63. */
  channelId?: number;
  /** LED feature version, 0 to 2. */
  ledVersion?: number;
  /** Infrared LED mode. */
  state?: "auto" | "close" | "open";
  /** Status light on or off. */
  lightState?: "close" | "open";
  /**
   * The doorbell button's light. Video Doorbell PoE only: its
   * `nets_led_state_s2x` writes it after `lightState`.
   */
  doorbellLightState?: "close" | "open" | "keepOff" | "keepOn";
};

/**
 * Codec for `<LedState>`.
 *
 * @example Build a cmd 209 request
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { ledState } from "@hertzg/reolink-api/protocol/params";
 *
 * assertEquals(
 *   ledState.encode({ channelId: 0, state: "close", lightState: "close" }),
 *   '<LedState version="1.1"><channelId>0</channelId><state>close</state>' +
 *     "<lightState>close</lightState></LedState>",
 * );
 * ```
 */
export const ledState: XmlParam<"LedState", LedState> = xmlParam("LedState", {
  channelId: optional(int()),
  ledVersion: optional(int()),
  state: optional(oneOf("auto", "close", "open")),
  lightState: optional(oneOf("close", "open")),
  doorbellLightState: optional(oneOf("close", "open", "keepOff", "keepOn")),
});
