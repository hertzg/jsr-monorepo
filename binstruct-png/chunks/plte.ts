import {
  array,
  type Coder,
  decode,
  encode,
  type Refiner,
  string,
  struct,
  u8,
} from "@hertzg/binstruct";
import type { PngChunkUnknown } from "../mod.ts";

export interface PlteChunk extends Omit<PngChunkUnknown, "type" | "data"> {
  type: "PLTE";
  data: {
    colors: [number, number, number][];
  };
}

export function plteChunkRefiner(): Refiner<PngChunkUnknown, PlteChunk, []> {
  const typeCoder = string(4);
  const rgpTupleCoder = array(u8(), 3) as unknown as Coder<
    [number, number, number]
  >; // total 3

  return {
    refine: (decoded: PngChunkUnknown, context): PlteChunk => {
      return {
        ...decoded,
        type: decode(typeCoder, decoded.type, context) as "PLTE",
        data: decode(
          struct({
            colors: array(rgpTupleCoder, Math.trunc(decoded.length / 3)),
          }),
          decoded.data,
          context,
        ),
      };
    },
    unrefine: (refined: PlteChunk, context): PngChunkUnknown => {
      return {
        ...refined,
        type: encode(typeCoder, refined.type, context, new Uint8Array(4)),
        data: encode(
          struct({
            colors: array(
              rgpTupleCoder,
              Math.trunc(refined.data.colors.length / 3),
            ),
          }),
          refined.data,
          context,
          new Uint8Array(refined.data.colors.length * 3),
        ),
      };
    },
  };
}
