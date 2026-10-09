/**
 * `<Scene>`: the white balance scene, the reply to cmd 162.
 *
 * Firmware: `nets_scene_s2x` writes `sceneMode`, always, as `indoor` or
 * `outdoor` (any other stored scene is written as `indoor`). The name is
 * registered with the shared `nets_isp_advance_common_x2s` parser, which
 * reads `<InputAdvanceCfg>` children and not this field, so this shape is
 * reply-only.
 *
 * @example Read the cmd 162 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { scene } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse('<Scene version="1.1"><sceneMode>outdoor</sceneMode></Scene>')
 *   .root;
 *
 * assertEquals(scene.decode(root).sceneMode, "outdoor");
 * ```
 *
 * @module
 */

import { oneOf, type XmlParam, xmlParam } from "../xml.ts";

/** The scene setting in `<Scene>`. */
export type Scene = {
  /** Scene the white balance is tuned for. */
  sceneMode: "indoor" | "outdoor";
};

/**
 * Codec for `<Scene>`.
 *
 * @example Build a `<Scene>` element
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { scene } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = scene.encode({ sceneMode: "indoor" });
 *
 * assertStringIncludes(xml, "<sceneMode>indoor</sceneMode>");
 * ```
 */
export const scene: XmlParam<"Scene", Scene> = xmlParam("Scene", {
  sceneMode: oneOf("indoor", "outdoor"),
});
