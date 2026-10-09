/**
 * Baichuan commands as data: an id, the firmware's name, and the parameter
 * elements its bodies carry.
 *
 * The firmware dispatches each command id to a handler that reads and writes
 * a fixed set of parameter elements. Which of them appear in a request and
 * which in a reply depends on the command (a GET sends nothing and gets the
 * parameters back, a SET sends them and gets an empty reply), so both
 * directions are typed as the same partial record of those parameters.
 *
 * ```
 * command(37, "GET_NETPORT_CFG_V20", [serverPort, rtspPort])
 *   body type  { ServerPort?: { serverPort: number; enable: number }; RtspPort?: … }
 * ```
 *
 * @example Encode and decode a command body
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import {
 *   command,
 *   decodeCommandBody,
 *   encodeCommandBody,
 * } from "@hertzg/reolink-api/protocol/command";
 * import { int, xmlParam } from "@hertzg/reolink-api/protocol/xml";
 *
 * const rtspPort = xmlParam("RtspPort", { rtspPort: int(), enable: int() });
 * const setPorts = command(36, "SET_NETPORT_CFG_V20", [rtspPort]);
 *
 * const xml = encodeCommandBody(setPorts, {
 *   RtspPort: { rtspPort: 554, enable: 1 },
 * });
 *
 * assertEquals(decodeCommandBody(setPorts, xml), {
 *   RtspPort: { rtspPort: 554, enable: 1 },
 * });
 * ```
 *
 * @module
 */

import { isElement, parse } from "@std/xml";
import type { AnyXmlParam, XmlParamValue } from "./xml.ts";

/**
 * A Baichuan command: its id, firmware name, and parameter elements.
 *
 * @template P The parameter codecs, as a tuple.
 */
export type Command<P extends readonly AnyXmlParam[] = readonly AnyXmlParam[]> =
  {
    /** The command id sent in the message header. */
    id: number;
    /** The name the firmware's dispatch table gives the command. */
    name: string;
    /** The parameter elements the command's bodies may carry. */
    params: P;
    /**
     * The firmware builds known to register the command, empty when unknown.
     * Registration does not promise that a given device answers it.
     */
    firmware: readonly Firmware[];
  };

/**
 * A firmware build whose command table this package was derived from.
 *
 * - `RLC-823A`: `IPC_523SD10.2898_23110119`, a PTZ camera.
 * - `Video Doorbell PoE`: `DB_566128M5MP_P.4662_2508071283`.
 */
export type Firmware = "RLC-823A" | "Video Doorbell PoE";

/**
 * The body of a {@link Command}, request or reply: each of its parameters by
 * element name, all optional.
 *
 * @template C The command.
 */
export type CommandBody<C extends Command> = {
  [P in C["params"][number] as P["name"]]?: XmlParamValue<P>;
};

/**
 * Declares a command.
 *
 * @param id The command id.
 * @param name The firmware's name for it.
 * @param params The parameter codecs its bodies carry.
 * @param firmware The firmware builds known to register it; empty by default.
 * @returns The command.
 *
 * @example Declare a command without parameters
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { command } from "@hertzg/reolink-api/protocol/command";
 *
 * const reboot = command(23, "REBOOT_V20", [], ["RLC-823A"]);
 *
 * assertEquals(reboot.id, 23);
 * assertEquals(reboot.firmware, ["RLC-823A"]);
 * ```
 */
export function command<const P extends readonly AnyXmlParam[]>(
  id: number,
  name: string,
  params: P,
  firmware: readonly Firmware[] = [],
): Command<P> {
  return { id, name, params, firmware };
}

/**
 * Writes a command body as XML. Parameters missing from `body` are left out;
 * an empty `body` gives an empty string, which the firmware treats as "use
 * the current values" rather than as an empty `<body/>`.
 *
 * @param command The command whose parameters to write.
 * @param body The parameter values, by element name.
 * @returns The body XML, or `""` when no parameter is given.
 *
 * @example An empty body stays empty
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { command, encodeCommandBody } from "@hertzg/reolink-api/protocol/command";
 *
 * assertEquals(encodeCommandBody(command(23, "REBOOT_V20", []), {}), "");
 * ```
 */
export function encodeCommandBody<C extends Command>(
  command: C,
  body: CommandBody<C>,
): string {
  const values = body as Record<string, unknown>;
  const elements = command.params
    .filter((param) => values[param.name] !== undefined)
    .map((param) => param.encode(values[param.name]));
  if (elements.length === 0) {
    return "";
  }
  return '<?xml version="1.0" encoding="UTF-8" ?>\n<body>' +
    elements.join("") + "</body>\n";
}

/**
 * Reads a command body. Elements that are not among the command's parameters
 * are ignored.
 *
 * @param command The command whose parameters to read.
 * @param xml The decrypted body XML; `""` reads as `{}`.
 * @returns The parameter values found, by element name.
 * @throws {Error} When a parameter element misses a field its codec requires.
 *
 * @example Ignore elements the command does not declare
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { command, decodeCommandBody } from "@hertzg/reolink-api/protocol/command";
 * import { int, xmlParam } from "@hertzg/reolink-api/protocol/xml";
 *
 * const linkType = command(93, "GET_LINK_TYPE", [
 *   xmlParam("LinkType", { channelId: int() }),
 * ]);
 *
 * assertEquals(decodeCommandBody(linkType, "<body><Other/></body>"), {});
 * ```
 */
export function decodeCommandBody<C extends Command>(
  command: C,
  xml: string,
): CommandBody<C> {
  if (xml.trim() === "") {
    return {} as CommandBody<C>;
  }
  const elements = parse(xml).root.children.filter(isElement);
  const body: Record<string, unknown> = {};
  for (const param of command.params) {
    const element = elements.find((node) => node.name.local === param.name);
    if (element !== undefined) {
      body[param.name] = param.decode(element);
    }
  }
  return body as CommandBody<C>;
}
