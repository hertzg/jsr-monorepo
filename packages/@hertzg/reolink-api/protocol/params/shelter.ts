/**
 * `<Shelter>`: privacy masks, the boxes blanked out of the video. The camera
 * replies with it to cmd 52 (`GET_SHELTER_CFG_V20`) and cmd 111
 * (`GET_DEF_INPUT_CFG_V20`), and reads it from cmd 53
 * (`SET_SHELTER_CFG_V20`).
 *
 * Firmware: the cmd 52 handler writes `channelId`, `enable` and
 * `shelterList`, always, with one inner `<Shelter>` per mask that has a
 * non-zero size. The parser `nets_pic_shelter_x2s` reads whichever fields
 * are present; each mask needs an `id`, and a mask with `enable` 0 is
 * cleared.
 *
 * @example Read a cmd 52 reply with one mask
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { shelter } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<Shelter version="1.1"><channelId>0</channelId><enable>1</enable>' +
 *     "<shelterList><Shelter><id>0</id><enable>1</enable><layer>0</layer>" +
 *     "<color>0</color><topLeftX>10</topLeftX><topLeftY>20</topLeftY>" +
 *     "<width>30</width><height>40</height></Shelter></shelterList></Shelter>",
 * ).root;
 *
 * assertEquals(shelter.decode(root).shelterList?.[0].width, 30);
 * ```
 *
 * @module
 */

import { int, list, obj, optional, type XmlParam, xmlParam } from "../xml.ts";

/** One privacy mask in `<shelterList>`. */
export type ShelterArea = {
  /** Mask number, 0 to 7. */
  id: number;
  /** 1 to keep the mask, 0 to clear it. */
  enable?: number;
  /** Mask layer. */
  layer?: number;
  /** Mask colour. */
  color?: number;
  /** Left edge. */
  topLeftX?: number;
  /** Top edge. */
  topLeftY?: number;
  /** Width, 0 or more. */
  width?: number;
  /** Height, 0 or more. */
  height?: number;
};

/** The privacy masks in `<Shelter>`. */
export type Shelter = {
  /** Zero-based channel. */
  channelId?: number;
  /** 1 when masks are drawn, 0 when off. */
  enable?: number;
  /** The masks. */
  shelterList?: ShelterArea[];
};

/**
 * Codec for `<Shelter>`.
 *
 * @example Build a `<Shelter>` element for cmd 53 that clears mask 2
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { shelter } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = shelter.encode({
 *   channelId: 0,
 *   shelterList: [{ id: 2, enable: 0 }],
 * });
 *
 * assertStringIncludes(
 *   xml,
 *   "<shelterList><Shelter><id>2</id><enable>0</enable></Shelter></shelterList>",
 * );
 * ```
 */
export const shelter: XmlParam<"Shelter", Shelter> = xmlParam("Shelter", {
  channelId: optional(int()),
  enable: optional(int()),
  shelterList: optional(list(
    "Shelter",
    obj({
      id: int(),
      enable: optional(int()),
      layer: optional(int()),
      color: optional(int()),
      topLeftX: optional(int()),
      topLeftY: optional(int()),
      width: optional(int()),
      height: optional(int()),
    }),
  )),
});
