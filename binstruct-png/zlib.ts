import {
  bytes,
  type Coder,
  refine,
  type Refiner,
  struct,
  u8,
} from "@hertzg/binstruct";
import { deflateRawSync, inflateRawSync } from "node:zlib";

export interface ZlibCompressedData {
  cmf: number;
  flg: number;

  raw: Uint8Array;
}

export function zlibCompressedDataCoder(): Coder<ZlibCompressedData> {
  return struct({
    cmf: u8(),
    flg: u8(),
    raw: bytes(),
  });
}

export interface ZlibRawCompressedRefinedData {
  compressionMethod: number;
  compressionInfo: number;
  checksum: number;
  isDictionaryPresent: number;
  compressionLevel: number;
  raw: Uint8Array;
}

function zlibRawCompressedDataRefiner(): Refiner<
  ZlibCompressedData,
  ZlibRawCompressedRefinedData
> {
  return {
    refine: (data, ctx) => {
      const { cmf, flg } = data;

      return {
        compressionMethod: (cmf >> 0) & 0b1111,
        compressionInfo: (cmf >> 4) & 0b1111,
        checksum: (flg >> 0) & 0b1111,
        isDictionaryPresent: (flg >> 4) & 0b1,
        compressionLevel: (flg >> 6) & 0b11,
        raw: data.raw,
      };
    },
    unrefine: (data) => {
      return {
        cmf: (data.compressionInfo << 4) |
          (data.compressionMethod << 0),
        flg: (data.compressionLevel << 6) |
          (data.isDictionaryPresent << 4) |
          (data.checksum << 0),
        raw: data.raw,
      };
    },
  };
}

export function zlibRawCompressedDataCoder(): Coder<
  ZlibRawCompressedRefinedData
> {
  return refine(
    zlibCompressedDataCoder(),
    zlibRawCompressedDataRefiner(),
  )();
}

export interface ZlibRefinedData {
  header: {
    compressionMethod: number;
    compressionInfo: number;
    checksum: number;
    isDictionaryPresent: number;
    compressionLevel: number;
  };
  data: Uint8Array;
}

export function zlibDataRefiner(): Refiner<
  ZlibRawCompressedRefinedData,
  ZlibRefinedData
> {
  return {
    refine: (data): ZlibRefinedData => {
      let decompressed: Uint8Array;
      try {
        decompressed = new Uint8Array(inflateRawSync(data.raw, {
          level: data.compressionLevel,
        }));
      } catch (e) {
        console.error("Error during inflateRawSync:", e);
        throw e;
      }

      return {
        header: {
          compressionMethod: data.compressionMethod,
          compressionInfo: data.compressionInfo,
          checksum: data.checksum,
          isDictionaryPresent: data.isDictionaryPresent,
          compressionLevel: data.compressionLevel,
        },
        data: decompressed,
      };
    },
    unrefine: (data) => {
      const compressed = deflateRawSync(data.data, {
        level: data.header.compressionLevel,
      });
      return {
        compressionMethod: data.header.compressionMethod,
        compressionInfo: data.header.compressionInfo,
        checksum: data.header.checksum,
        isDictionaryPresent: data.header.isDictionaryPresent,
        compressionLevel: data.header.compressionLevel,
        raw: new Uint8Array(
          compressed.buffer,
          compressed.byteOffset,
          compressed.byteLength,
        ),
      };
    },
  };
}

export function zlibDataCoder(): Coder<ZlibRefinedData> {
  return refine(
    zlibRawCompressedDataCoder(),
    zlibDataRefiner(),
  )();
}
