import { bytes, decode, encode, type Refiner, string } from "@hertzg/binstruct";
import type { PngChunkUnknown } from "../mod.ts";

export interface IdatChunk extends Omit<PngChunkUnknown, "type" | "data"> {
  type: "IDAT";
  data: Uint8Array;
}

export function idatChunkRefiner(): Refiner<PngChunkUnknown, IdatChunk, []> {
  const typeCoder = string(4);
  const dataCoder = bytes();

  return {
    refine: (decoded: PngChunkUnknown, context): IdatChunk => {
      return {
        ...decoded,
        type: decode(typeCoder, decoded.type, context) as "IDAT",
        data: decode(dataCoder, decoded.data, context),
      };
    },
    unrefine: (refined: IdatChunk, context): PngChunkUnknown => {
      return {
        ...refined,
        type: encode(typeCoder, refined.type, context, new Uint8Array(4)),
        data: encode(
          dataCoder,
          refined.data,
          context,
          new Uint8Array(refined.data.length),
        ),
      };
    },
  };
}
