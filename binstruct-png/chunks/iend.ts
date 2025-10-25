import { decode, encode, type Refiner, string } from "@hertzg/binstruct";
import type { PngChunkUnknown } from "../mod.ts";

export interface IendChunk extends Omit<PngChunkUnknown, "type" | "data"> {
  type: "IEND";
  crc: number;
}

export function iendChunkRefiner(): Refiner<PngChunkUnknown, IendChunk, []> {
  const typeCoder = string(4);

  return {
    refine: (decoded: PngChunkUnknown, context): IendChunk => {
      return {
        length: decoded.length,
        type: decode(typeCoder, decoded.type, context) as "IEND",
        crc: decoded.crc,
      };
    },
    unrefine: (refined: IendChunk, context): PngChunkUnknown => {
      return {
        length: refined.length,
        type: encode(typeCoder, refined.type, context, new Uint8Array(4)),
        data: new Uint8Array(0),
        crc: refined.crc,
      };
    },
  };
}
