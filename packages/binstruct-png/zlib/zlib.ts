import {
  bytes,
  type Coder,
  encode,
  refine,
  type Refiner,
  struct,
} from "@hertzg/binstruct";
import { unzlibSync, zlibSync } from "fflate";
import { type ZlibHeader, zlibHeaderCoder } from "./header.ts";

interface ZlibCompressedData {
  header: ZlibHeader;
  compressed: Uint8Array;
  checksum: Uint8Array;
}

function zlibCompressedCoder(): Coder<ZlibCompressedData> {
  return refine(
    struct({
      header: zlibHeaderCoder(),
      compressedWithChecksum: bytes(),
    }),
    {
      refine: (unrefined): ZlibCompressedData => {
        const compressed = unrefined.compressedWithChecksum.subarray(
          0,
          unrefined.compressedWithChecksum.length - 4,
        );

        const checksum = unrefined.compressedWithChecksum.subarray(
          compressed.length,
        );

        return {
          header: unrefined.header,
          compressed,
          checksum,
        };
      },

      unrefine: (refined) => {
        const rawWithChecksum = new Uint8Array(
          refined.compressed.length + refined.checksum.length,
        );
        rawWithChecksum.set(refined.compressed, 0);
        rawWithChecksum.set(refined.checksum, refined.compressed.length);

        return {
          header: refined.header,
          compressedWithChecksum: rawWithChecksum,
        };
      },
    },
  )();
}

export interface ZlibUncompressedData {
  header: ZlibHeader;
  uncompressed: Uint8Array;
  checksum: Uint8Array;
}

function zlibFLevel2Clevel(fLevel: number): number {
  switch (fLevel) {
    // TODO: There's no way to diffrentiate store vs fastest without looking at the deflate stream
    //       when reconstructing there's no deflate stream only original bytes. So we are lossy
    //       not able to recompress identical byte stream for use case 1.
    case 0: // store or fastest
      return 0; // store (see TODO above)
    case 1:
      return 4; // fast
    case 2:
      return 6; // default
    case 3:
      return 9; // maximum
    default:
      throw new Error("Invalid FLEVEL");
  }
}

function zlibUncompressRefiner(): Refiner<
  ZlibCompressedData,
  ZlibUncompressedData
> {
  const headerCoder = zlibHeaderCoder();
  return {
    refine: (unrefined, ctx): ZlibUncompressedData => {
      const zlibCompressedData = new Uint8Array(
        2 + unrefined.compressed.length + unrefined.checksum.length,
      );

      encode(
        headerCoder,
        unrefined.header,
        ctx,
        zlibCompressedData.subarray(0, 2),
      );

      zlibCompressedData.set(unrefined.compressed, 2);
      zlibCompressedData.set(
        unrefined.checksum,
        2 + unrefined.compressed.length,
      );

      const decompressed = unzlibSync(zlibCompressedData);

      return {
        header: unrefined.header,
        uncompressed: decompressed,
        checksum: unrefined.checksum,
      };
    },
    unrefine: (refined) => {
      const compressed = zlibSync(refined.uncompressed, {
        level: zlibFLevel2Clevel(refined.header.flevel) as
          | 0
          | 1
          | 2
          | 3
          | 4
          | 5
          | 6
          | 7
          | 8
          | 9,
      });

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
