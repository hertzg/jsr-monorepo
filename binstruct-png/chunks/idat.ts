import { decode, encode, type Refiner, string } from "@hertzg/binstruct";
import type { PngChunkUnknown } from "../mod.ts";
import { zlibUncompressedCoder, type ZlibUncompressedData } from "../zlib.ts";

export interface IdatChunk extends Omit<PngChunkUnknown, "type" | "data"> {
  type: "IDAT";
  data: ZlibUncompressedData;
}

export function idatChunkRefiner(): Refiner<PngChunkUnknown, IdatChunk, []> {
  const typeCoder = string(4);
  const dataCoder = zlibUncompressedCoder();

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
        ),
      };
    },
  };
}
