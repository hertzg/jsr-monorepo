import type { PngChunkUnknown } from "@binstruct/png";
import {
  decode,
  encode,
  type Refiner,
  string,
  struct,
  u32be,
  u8,
} from "@hertzg/binstruct";

export interface IhdrChunk extends Omit<PngChunkUnknown, "type" | "data"> {
  type: "IHDR";
  data: {
    width: number;
    height: number;
    bitDepth: number;
    colorType: number;
    compressionMethod: number;
    filterMethod: number;
    interlaceMethod: number;
  };
}

export function ihdrChunkRefiner(): Refiner<PngChunkUnknown, IhdrChunk, []> {
  const typeCoder = string(4);
  const dataCoder = struct({
    width: u32be(), // 4
    height: u32be(), // 4
    bitDepth: u8(), // 1
    colorType: u8(), // 1
    compressionMethod: u8(), // 1
    filterMethod: u8(), // 1
    interlaceMethod: u8(), // 1
  }); // total 13

  return {
    refine: (decoded: PngChunkUnknown): IhdrChunk => {
      return {
        ...decoded,
        type: decode(typeCoder, decoded.type) as "IHDR",
        data: decode(dataCoder, decoded.data),
      };
    },
    unrefine: (refined: IhdrChunk) => {
      return {
        ...refined,
        type: encode(typeCoder, refined.type, undefined, new Uint8Array(4)),
        data: encode(dataCoder, refined.data, undefined, new Uint8Array(13)),
      };
    },
  };
}
