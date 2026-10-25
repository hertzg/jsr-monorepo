/**
 * A field of coordinate pairs.
 *
 * @module
 */

import { isElement } from "@std/xml";
import type { OneField } from "./decode-fields.ts";
import { int } from "./int.ts";
import { obj } from "./obj.ts";

/** A point in a device's normalized 1000 x 1000 screen space. */
export type Point = {
  /** `<positionX>`, 0 at the left edge. */
  x: number;
  /** `<positionY>`, 0 at the top edge. */
  y: number;
};

/**
 * A field that reads every child of the element as a `<positionX>`,
 * `<positionY>` pair, whatever the child is called: ISAPI names them
 * `<RegionCoordinates>` in regions and `<Coordinates>` on lines.
 *
 * @returns The field.
 *
 * @example Read a polygon
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { points } from "./points.ts";
 *
 * const list = parse(
 *   "<RegionCoordinatesList>" +
 *     "<RegionCoordinates><positionX>0</positionX><positionY>0</positionY></RegionCoordinates>" +
 *     "<RegionCoordinates><positionX>1000</positionX><positionY>500</positionY></RegionCoordinates>" +
 *     "</RegionCoordinatesList>",
 * ).root;
 *
 * assertEquals(points().decode(list), [{ x: 0, y: 0 }, { x: 1000, y: 500 }]);
 * ```
 */
export function points(): OneField<Point[]> {
  const pair = obj({ positionX: int(), positionY: int() });
  return {
    decode: (element) =>
      element.children.filter(isElement).map((child) => {
        const { positionX, positionY } = pair.decode(child);
        return { x: positionX, y: positionY };
      }),
  };
}
