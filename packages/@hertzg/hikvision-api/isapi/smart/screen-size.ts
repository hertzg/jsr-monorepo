/**
 * The normalized screen space smart rule shapes are drawn in.
 *
 * @module
 */

import type { OneField } from "../document/decode-fields.ts";
import { int } from "../document/int.ts";
import { obj } from "../document/obj.ts";

/**
 * `<normalizedScreenSize>`: the space the coordinates are drawn in.
 *
 * @example Describe the default screen space
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import type { NormalizedScreenSize } from "./screen-size.ts";
 *
 * const size: NormalizedScreenSize = { width: 1000, height: 1000 };
 *
 * assertEquals(size.width, size.height);
 * ```
 */
export type NormalizedScreenSize = {
  /** `<normalizedScreenWidth>`, usually `1000`. */
  width: number;
  /** `<normalizedScreenHeight>`, usually `1000`. */
  height: number;
};

/**
 * The `<normalizedScreenSize>` field, read as its width and height.
 *
 * @example Read the default screen space
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { children } from "../document/children.ts";
 * import { screenSize } from "./screen-size.ts";
 *
 * const root = parse(
 *   "<LineDetection><normalizedScreenSize>" +
 *     "<normalizedScreenWidth>1000</normalizedScreenWidth>" +
 *     "<normalizedScreenHeight>1000</normalizedScreenHeight>" +
 *     "</normalizedScreenSize></LineDetection>",
 * ).root;
 *
 * assertEquals(screenSize.decode(children(root, "normalizedScreenSize")[0]), { width: 1000, height: 1000 });
 * ```
 */
export const screenSize: OneField<NormalizedScreenSize> = {
  decode: (element) => {
    const { normalizedScreenWidth: width, normalizedScreenHeight: height } =
      obj({ normalizedScreenWidth: int(), normalizedScreenHeight: int() })
        .decode(element);
    return { width, height };
  },
};
