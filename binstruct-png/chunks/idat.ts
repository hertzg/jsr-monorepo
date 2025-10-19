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
    refine: (decoded: PngChunkUnknown): IdatChunk => {
      return {
        ...decoded,
        type: decode(typeCoder, decoded.type) as "IDAT",
        data: decode(dataCoder, decoded.data),
      };
    },
    unrefine: (refined: IdatChunk): PngChunkUnknown => {
      return {
        ...refined,
        type: encode(typeCoder, refined.type, undefined, new Uint8Array(4)),
        data: encode(
          dataCoder,
          refined.data,
          undefined,
          new Uint8Array(refined.data.length),
        ),
      };
    },
  };
}
