/**
 * `<Serial>`: the PTZ serial port settings (RS-485 baud rate, framing and
 * PELCO protocol). The camera pushes it unasked as cmd 79 when it changes.
 *
 * Firmware: `net_ptz_param_s2x` writes every field, always.
 *
 * @example Read the cmd 79 push
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { serial } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<Serial version="1.1"><channelId>0</channelId><baudRate>9600</baudRate>' +
 *     "<dataBit>CS8</dataBit><stopBit>1</stopBit><parity>none</parity>" +
 *     "<flowControl>none</flowControl><controlProtocol>PELCO_D</controlProtocol>" +
 *     "<controlAddress>1</controlAddress></Serial>",
 * ).root;
 *
 * assertEquals(serial.decode(root).controlProtocol, "PELCO_D");
 * ```
 *
 * @module
 */

import { int, oneOf, text, type XmlParam, xmlParam } from "../xml.ts";

/** The PTZ serial port settings in `<Serial>`. */
export type Serial = {
  /** Zero-based channel. */
  channelId: number;
  /** 1200, 2400, 4800 or 9600; the firmware writes 9600 for an unknown index. */
  baudRate: number;
  /** Data bits as a name, such as `CS8`. */
  dataBit: string;
  /** 1 or 2. */
  stopBit: number;
  /** Parity. */
  parity: "none" | "odd" | "even";
  /** Flow control. */
  flowControl: "none" | "hard" | "xon:xoff";
  /** PTZ control protocol. */
  controlProtocol: "PELCO_D" | "PELCO_P";
  /** PELCO device address. */
  controlAddress: number;
};

/**
 * Codec for `<Serial>`.
 *
 * @example Build a `<Serial>` element
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { serial } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = serial.encode({
 *   channelId: 0,
 *   baudRate: 2400,
 *   dataBit: "CS8",
 *   stopBit: 1,
 *   parity: "even",
 *   flowControl: "xon:xoff",
 *   controlProtocol: "PELCO_P",
 *   controlAddress: 3,
 * });
 *
 * assertStringIncludes(xml, "<flowControl>xon:xoff</flowControl>");
 * ```
 */
export const serial: XmlParam<"Serial", Serial> = xmlParam("Serial", {
  channelId: int(),
  baudRate: int(),
  dataBit: text(),
  stopBit: int(),
  parity: oneOf("none", "odd", "even"),
  flowControl: oneOf("none", "hard", "xon:xoff"),
  controlProtocol: oneOf("PELCO_D", "PELCO_P"),
  controlAddress: int(),
});
