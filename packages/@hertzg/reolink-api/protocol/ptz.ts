/**
 * PTZ (pan, tilt, zoom) requests.
 *
 * ```
 * cmd 18,  ptzControlXml  ->  empty status-200 reply; moves until "Stop"
 * cmd 19,  ptzPresetXml   ->  empty status-200 reply
 * cmd 190, no body        ->  <PtzPreset><presetList><preset>...</preset>
 * ```
 *
 * All three address the channel through the message extension.
 *
 * @example Pan left, then stop
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { PTZ_COMMAND, ptzControlXml } from "@hertzg/reolink-api/protocol/ptz";
 *
 * assertStringIncludes(
 *   ptzControlXml({ channel: 0, command: PTZ_COMMAND.LEFT, speed: 32 }),
 *   "<command>Left</command>",
 * );
 * assertStringIncludes(
 *   ptzControlXml({ channel: 0, command: PTZ_COMMAND.STOP }),
 *   "<command>Stop</command>",
 * );
 * ```
 *
 * @module
 */

import { isElement, isText, parse, type XmlElement } from "@std/xml";

/**
 * PTZ commands for {@link ptzControlXml}. A move keeps going until `STOP`.
 *
 * @example Zoom in
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { PTZ_COMMAND } from "@hertzg/reolink-api/protocol/ptz";
 *
 * assertEquals(PTZ_COMMAND.ZOOM_IN, "ZoomInc");
 * ```
 */
export const PTZ_COMMAND = {
  /** Stop any move or zoom. */
  STOP: "Stop",
  /** Pan left. */
  LEFT: "Left",
  /** Pan right. */
  RIGHT: "Right",
  /** Tilt up. */
  UP: "Up",
  /** Tilt down. */
  DOWN: "Down",
  /** Pan left and tilt up. */
  LEFT_UP: "LeftUp",
  /** Pan left and tilt down. */
  LEFT_DOWN: "LeftDown",
  /** Pan right and tilt up. */
  RIGHT_UP: "RightUp",
  /** Pan right and tilt down. */
  RIGHT_DOWN: "RightDown",
  /** Zoom in. */
  ZOOM_IN: "ZoomInc",
  /** Zoom out. */
  ZOOM_OUT: "ZoomDec",
  /** Start the camera's automatic scan. */
  AUTO: "Auto",
} as const;

/** Union of the {@link PTZ_COMMAND} values. */
export type PtzCommand = (typeof PTZ_COMMAND)[keyof typeof PTZ_COMMAND];

/** What {@link ptzControlXml} asks the camera to do. */
export type PtzControlRequest = {
  /** The zero-based channel number. */
  channel: number;
  /** The move to make. */
  command: PtzCommand;
  /** Move speed. Leave it out for the camera's default. */
  speed?: number;
};

/** A saved PTZ position. */
export type PtzPreset = {
  /** The id to pass to {@link ptzPresetXml}. */
  id: number;
  /** The name it was saved under. */
  name: string;
};

/**
 * Builds the body of a PTZ move (cmd 18).
 *
 * @param request The channel, command and optional speed.
 * @returns The request XML, ready to be encrypted.
 *
 * @example Tilt up at speed 10
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { PTZ_COMMAND, ptzControlXml } from "@hertzg/reolink-api/protocol/ptz";
 *
 * const xml = ptzControlXml({ channel: 0, command: PTZ_COMMAND.UP, speed: 10 });
 *
 * assertStringIncludes(xml, "<command>Up</command>");
 * assertStringIncludes(xml, "<speed>10</speed>");
 * ```
 */
export function ptzControlXml(request: PtzControlRequest): string {
  const { channel, command, speed } = request;
  return '<?xml version="1.0" encoding="UTF-8" ?>\n' +
    "<body>\n" +
    '<PtzControl version="1.1">\n' +
    `<channelId>${channel}</channelId>\n` +
    `<command>${command}</command>\n` +
    (speed === undefined ? "" : `<speed>${speed}</speed>\n`) +
    "</PtzControl>\n" +
    "</body>\n";
}

/**
 * Builds the body of a request that moves to a saved preset (cmd 19).
 *
 * @param request The channel and the preset id from {@link parsePtzPresets}.
 * @returns The request XML, ready to be encrypted.
 *
 * @example Go to preset 3
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { ptzPresetXml } from "@hertzg/reolink-api/protocol/ptz";
 *
 * const xml = ptzPresetXml({ channel: 0, id: 3 });
 *
 * assertStringIncludes(xml, "<id>3</id>");
 * assertStringIncludes(xml, "<command>toPos</command>");
 * ```
 */
export function ptzPresetXml(request: { channel: number; id: number }): string {
  return '<?xml version="1.0" encoding="UTF-8" ?>\n' +
    "<body>\n" +
    '<PtzPreset version="1.1">\n' +
    `<channelId>${request.channel}</channelId>\n` +
    "<presetList>\n" +
    "<preset>\n" +
    `<id>${request.id}</id>\n` +
    "<command>toPos</command>\n" +
    "</preset>\n" +
    "</presetList>\n" +
    "</PtzPreset>\n" +
    "</body>\n";
}

/**
 * Reads the saved presets from the reply to a cmd 190 request.
 *
 * Presets without both an id and a name, which the camera lists for unused
 * slots, are left out.
 *
 * @param xml The decrypted reply body.
 * @returns The saved presets, in reply order.
 *
 * @example Read two presets
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parsePtzPresets } from "@hertzg/reolink-api/protocol/ptz";
 *
 * const presets = parsePtzPresets(
 *   "<body><PtzPreset><presetList>" +
 *     "<preset><id>1</id><name>gate</name></preset>" +
 *     "<preset><id>2</id><name>porch</name></preset>" +
 *     "</presetList></PtzPreset></body>",
 * );
 *
 * assertEquals(presets, [{ id: 1, name: "gate" }, { id: 2, name: "porch" }]);
 * ```
 */
export function parsePtzPresets(xml: string): PtzPreset[] {
  return findElements(parse(xml).root, "preset").flatMap((preset) => {
    const id = childText(preset, "id");
    const name = childText(preset, "name");
    return id === undefined || name === undefined
      ? []
      : [{ id: Number(id), name }];
  });
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
