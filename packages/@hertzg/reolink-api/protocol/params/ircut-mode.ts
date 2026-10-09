/**
 * `<IrcutMode>`: how the infrared-cut filter switches, the reply to cmd 166.
 *
 * Firmware: `nets_ircut_mode_s2x` writes `mode`, always. The name is
 * registered with the shared `nets_isp_advance_common_x2s` parser, which
 * reads `<InputAdvanceCfg>` children and not this field, so this shape is
 * reply-only.
 *
 * @example Read the cmd 166 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { ircutMode } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse('<IrcutMode version="1.1"><mode>ir</mode></IrcutMode>').root;
 *
 * assertEquals(ircutMode.decode(root).mode, "ir");
 * ```
 *
 * @module
 */

import { oneOf, type XmlParam, xmlParam } from "../xml.ts";

/** The IR-cut filter setting in `<IrcutMode>`. */
export type IrcutMode = {
  /** Switch automatically, or follow the infrared light. */
  mode: "auto" | "ir";
};

/**
 * Codec for `<IrcutMode>`.
 *
 * @example Build an `<IrcutMode>` element
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { ircutMode } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = ircutMode.encode({ mode: "auto" });
 *
 * assertStringIncludes(xml, "<mode>auto</mode>");
 * ```
 */
export const ircutMode: XmlParam<"IrcutMode", IrcutMode> = xmlParam(
  "IrcutMode",
  {
    mode: oneOf("auto", "ir"),
  },
);
