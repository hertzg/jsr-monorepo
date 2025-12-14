import {
  bytes,
  type Coder,
  refine,
  type Refiner,
  struct,
  u8,
} from "@hertzg/binstruct";
import { deflateSync, inflateSync } from "node:zlib";

interface ZlibCompressedWithChecksum {
  cmf: number;
  flg: number;

  compressedWithChecksum: Uint8Array;
}

function zlibCompressedWithChecksumCoder(): Coder<
  ZlibCompressedWithChecksum
> {
  return struct({
    cmf: u8(),
    flg: u8(),
    compressedWithChecksum: bytes(),
  });
}

interface ZlibHeaderParsed {
  compressionMethod: number;
  compressionInfo: number;
  checksum: number;
  isDictionaryPresent: number;
  compressionLevel: number;
}

export function decodeHeader([cmf, flg]: number[]): ZlibHeaderParsed {
  return {
    compressionMethod: (cmf >> 0) & 0b1111,
    compressionInfo: (cmf >> 4) & 0b1111,
    checksum: (flg >> 0) & 0b11111,
    isDictionaryPresent: (flg >> 5) & 0b1,
    compressionLevel: (flg >> 6) & 0b11,
  };
}

export function encodeHeader(data: ZlibHeaderParsed): number[] {
  const cmf = ((data.compressionInfo & 0b1111) << 4) |
    ((data.compressionMethod & 0b1111) << 0);

  const flg = ((data.compressionLevel & 0b11) << 6) |
    ((data.isDictionaryPresent & 0b1) << 4) |
    ((data.checksum & 0b11111) << 0);

  return [cmf, flg];
}

interface ZlibCompressedData {
  header: ZlibHeaderParsed;
  compressed: Uint8Array;
  checksum: Uint8Array;
}

function zlibCompressedRefiner(): Refiner<
  ZlibCompressedWithChecksum,
  ZlibCompressedData
> {
  return {
    refine: (unrefined) => {
      const { cmf, flg } = unrefined;

      const compressed = unrefined.compressedWithChecksum.subarray(
        0,
        unrefined.compressedWithChecksum.length - 4,
      );

      const checksum = unrefined.compressedWithChecksum.subarray(
        compressed.length,
      );

      return {
        header: decodeHeader([cmf, flg]),
        compressed,
        checksum,
      };
    },

    unrefine: (refined) => {
      const [cmf, flg] = encodeHeader(refined.header);

      const rawWithChecksum = new Uint8Array(
        refined.compressed.length + refined.checksum.length,
      );
      rawWithChecksum.set(refined.compressed, 0);
      rawWithChecksum.set(refined.checksum, refined.compressed.length);

      return {
        cmf,
        flg,
        compressedWithChecksum: rawWithChecksum,
      };
    },
  };
}

function zlibCompressedCoder(): Coder<
  ZlibCompressedData
> {
  return refine(
    zlibCompressedWithChecksumCoder(),
    zlibCompressedRefiner(),
  )();
}

export interface ZlibUncompressedData {
  header: ZlibHeaderParsed;
  uncompressed: Uint8Array;
  checksum: Uint8Array;
}

function zlibUncompressRefiner(): Refiner<
  ZlibCompressedData,
  ZlibUncompressedData
> {
  return {
    refine: (unrefined): ZlibUncompressedData => {
      const zlibCompressedData = new Uint8Array(
        2 + unrefined.compressed.length + unrefined.checksum.length,
      );
      zlibCompressedData.set(
        encodeHeader(unrefined.header),
        0,
      );
      zlibCompressedData.set(unrefined.compressed, 2);
      zlibCompressedData.set(
        unrefined.checksum,
        2 + unrefined.compressed.length,
      );

      const decompressed = new Uint8Array(
        inflateSync(zlibCompressedData),
      );

      return {
        header: unrefined.header,
        uncompressed: decompressed,
        checksum: unrefined.checksum,
      };
    },
    unrefine: (refined) => {
      const compressed = new Uint8Array(deflateSync(refined.uncompressed, {
        level: refined.header.compressionLevel,
      }));

      const raw = compressed.subarray(2, compressed.length - 4);
      const checksum = compressed.subarray(compressed.length - 4);

      return {
        header: refined.header,
        compressed: raw,
        checksum,
      };
    },
  };
}

export function zlibUncompressedCoder(): Coder<ZlibUncompressedData> {
  return refine(
    zlibCompressedCoder(),
    zlibUncompressRefiner(),
  )();
}
