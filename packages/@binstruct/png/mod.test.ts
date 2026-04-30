import { assertEquals, assertGreaterOrEqual } from "@std/assert";
import {
  chunkCrc,
  pngChunkRefined,
  type PngChunkUnknown,
  pngChunkUnknown,
  type PngFile,
  pngFile,
  pngFileChunks,
} from "./mod.ts";
import type { IhdrChunk } from "./chunks/ihdr.ts";
import type { IdatChunk } from "./chunks/idat.ts";
import type { IendChunk } from "./chunks/iend.ts";
import type { PlteChunk } from "./chunks/plte.ts";
import { zlibSync } from "fflate";
import { decodeHeader } from "./zlib/header.ts";

const PNG_SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
const PNG_SIGNATURE_DECODED = {
  highBitByte: 137,
  signature: "PNG",
  dosEOF: "\u001a",
  dosLineEnding: "\r\n",
  unixLineEnding: "\n",
};

Deno.test("pngChunkUnknown() - decodes unknown chunk", () => {
  const coder = pngChunkUnknown();
  // deno-fmt-ignore
  const buffer = new Uint8Array([
    0, 0, 0, 5, // length: 5
    116, 69, 88, 116, // type: "tEXt"
    72, 101, 108, 108, 111, // data: "Hello"
    0x12, 0x34, 0x56, 0x78, // crc
  ]);

  const [decoded, bytesRead] = coder.decode(buffer);

  assertEquals(bytesRead, 17);
  assertEquals(decoded.length, 5);
  assertEquals(decoded.type, new Uint8Array([116, 69, 88, 116]));
  assertEquals(decoded.data, new Uint8Array([72, 101, 108, 108, 111]));
  assertEquals(decoded.crc, 0x12345678);
});

Deno.test("pngChunkUnknown() - encodes unknown chunk", () => {
  const coder = pngChunkUnknown();
  const chunk: PngChunkUnknown = {
    length: 5,
    type: new Uint8Array([116, 69, 88, 116]), // "tEXt"
    data: new Uint8Array([72, 101, 108, 108, 111]), // "Hello"
    crc: 0x12345678,
  };

  const buffer = new Uint8Array(17);
  const bytesWritten = coder.encode(chunk, buffer);

  assertEquals(bytesWritten, 17);
  // deno-fmt-ignore
  assertEquals(buffer, new Uint8Array([
    0, 0, 0, 5, // length: 5
    116, 69, 88, 116, // type: "tEXt"
    72, 101, 108, 108, 111, // data: "Hello"
    0x12, 0x34, 0x56, 0x78, // crc
  ]));
});

Deno.test("pngChunkUnknown() - round-trip with empty data", () => {
  const coder = pngChunkUnknown();
  const chunk: PngChunkUnknown = {
    length: 0,
    type: new Uint8Array([73, 69, 78, 68]), // "IEND"
    data: new Uint8Array(0),
    crc: 0xAE426082,
  };

  const buffer = new Uint8Array(12);
  const bytesWritten = coder.encode(chunk, buffer);
  const [decoded, bytesRead] = coder.decode(buffer);

  assertEquals(bytesRead, bytesWritten);
  assertEquals(decoded.length, chunk.length);
  assertEquals(decoded.type, chunk.type);
  assertEquals(decoded.data, chunk.data);
  assertEquals(decoded.crc, chunk.crc);
});

Deno.test("pngFileChunks() - decodes PNG file with multiple chunks", () => {
  const coder = pngFileChunks(pngChunkUnknown());
  // deno-fmt-ignore
  const buffer = new Uint8Array([
    ...PNG_SIGNATURE,
    // Chunk 1
    0, 0, 0, 3, // length: 3
    65, 65, 65, 65, // type: "AAAA"
    1, 2, 3, // data
    0, 0, 0, 1, // crc
    // Chunk 2
    0, 0, 0, 2, // length: 2
    66, 66, 66, 66, // type: "BBBB"
    4, 5, // data
    0, 0, 0, 2, // crc
  ]);

  const [decoded, bytesRead] = coder.decode(buffer);

  assertEquals(bytesRead, 8 + 15 + 14);
  assertEquals(decoded.signature, PNG_SIGNATURE_DECODED);
  assertEquals(decoded.chunks.length, 2);
  assertEquals(decoded.chunks[0].length, 3);
  assertEquals(decoded.chunks[0].data, new Uint8Array([1, 2, 3]));
  assertEquals(decoded.chunks[1].length, 2);
  assertEquals(decoded.chunks[1].data, new Uint8Array([4, 5]));
});

Deno.test("pngFileChunks() - encodes PNG file with multiple chunks", () => {
  const coder = pngFileChunks(pngChunkUnknown());
  const pngData: PngFile<PngChunkUnknown> = {
    signature: PNG_SIGNATURE_DECODED,
    chunks: [
      {
        length: 3,
        type: new Uint8Array([65, 65, 65, 65]), // "AAAA"
        data: new Uint8Array([1, 2, 3]),
        crc: 1,
      },
      {
        length: 2,
        type: new Uint8Array([66, 66, 66, 66]), // "BBBB"
        data: new Uint8Array([4, 5]),
        crc: 2,
      },
    ],
  };

  const buffer = new Uint8Array(100);
  const bytesWritten = coder.encode(pngData, buffer);

  assertEquals(bytesWritten, 37);
  assertEquals(buffer.slice(0, 8), PNG_SIGNATURE);
});

Deno.test("pngFileChunks() - round-trip with empty chunks array", () => {
  const coder = pngFileChunks(pngChunkUnknown());
  const pngData: PngFile<PngChunkUnknown> = {
    signature: PNG_SIGNATURE_DECODED,
    chunks: [],
  };

  const buffer = new Uint8Array(100);
  const bytesWritten = coder.encode(pngData, buffer);
  const [decoded, bytesRead] = coder.decode(buffer.subarray(0, bytesWritten));

  assertEquals(bytesRead, bytesWritten);
  assertEquals(decoded.signature, pngData.signature);
  assertEquals(decoded.chunks.length, 0);
});

Deno.test("pngChunkRefined() - decodes IHDR chunk", () => {
  const coder = pngChunkRefined();
  // deno-fmt-ignore
  const buffer = new Uint8Array([
    0, 0, 0, 13, // length: 13
    73, 72, 68, 82, // type: "IHDR"
    0, 0, 0, 100, // width: 100
    0, 0, 0, 200, // height: 200
    8, // bitDepth: 8
    2, // colorType: 2
    0, // compressionMethod: 0
    0, // filterMethod: 0
    0, // interlaceMethod: 0
    0x12, 0x34, 0x56, 0x78, // crc
  ]);

  const [decoded, bytesRead] = coder.decode(buffer);

  assertEquals(bytesRead, 25);
  assertEquals((decoded as IhdrChunk).type, "IHDR");
  assertEquals((decoded as IhdrChunk).data.width, 100);
  assertEquals((decoded as IhdrChunk).data.height, 200);
  assertEquals((decoded as IhdrChunk).data.bitDepth, 8);
  assertEquals((decoded as IhdrChunk).data.colorType, 2);
});

Deno.test("pngChunkRefined() - encodes IHDR chunk", () => {
  const coder = pngChunkRefined();
  const chunk: IhdrChunk = {
    length: 13,
    type: "IHDR",
    data: {
      width: 100,
      height: 200,
      bitDepth: 8,
      colorType: 2,
      compressionMethod: 0,
      filterMethod: 0,
      interlaceMethod: 0,
    },
    crc: 0x12345678,
  };

  const buffer = new Uint8Array(100);
  const bytesWritten = coder.encode(chunk, buffer);

  assertEquals(bytesWritten, 25);
  assertEquals(buffer[0], 0); // length high byte
  assertEquals(buffer[3], 13); // length low byte
  assertEquals(buffer[4], 73); // 'I'
  assertEquals(buffer[5], 72); // 'H'
  assertEquals(buffer[6], 68); // 'D'
  assertEquals(buffer[7], 82); // 'R'
});

Deno.test("pngChunkRefined() - decodes IDAT chunk", () => {
  const coder = pngChunkRefined();
  const uncompressed = new Uint8Array([1, 2, 3, 4, 5]);
  const compressedData = new Uint8Array(zlibSync(uncompressed));
  // deno-fmt-ignore
  const buffer = new Uint8Array([
    0, 0, 0, compressedData.length, // length
    73, 68, 65, 84, // type: "IDAT"
    ...compressedData, // data
    0x11, 0x22, 0x33, 0x44, // crc
  ]);

  const [decoded, bytesRead] = coder.decode(buffer);

  assertEquals(bytesRead, 12 + compressedData.length);
  assertEquals((decoded as IdatChunk).type, "IDAT");
  assertEquals((decoded as IdatChunk).data.uncompressed, uncompressed);
});

Deno.test("pngChunkRefined() - decodes IEND chunk", () => {
  const coder = pngChunkRefined();
  // deno-fmt-ignore
  const buffer = new Uint8Array([
    0, 0, 0, 0, // length: 0
    73, 69, 78, 68, // type: "IEND"
    0xAE, 0x42, 0x60, 0x82, // crc
  ]);

  const [decoded, bytesRead] = coder.decode(buffer);

  assertEquals(bytesRead, 12);
  assertEquals((decoded as IendChunk).type, "IEND");
  assertEquals((decoded as IendChunk).length, 0);
  assertEquals((decoded as IendChunk).crc, 0xAE426082);
});

Deno.test("pngChunkRefined() - decodes PLTE chunk", () => {
  const coder = pngChunkRefined();
  // deno-fmt-ignore
  const buffer = new Uint8Array([
    0, 0, 0, 9, // length: 9 (3 colors)
    80, 76, 84, 69, // type: "PLTE"
    255, 0, 0, // color 1: red
    0, 255, 0, // color 2: green
    0, 0, 255, // color 3: blue
    0x11, 0x22, 0x33, 0x44, // crc
  ]);

  const [decoded, bytesRead] = coder.decode(buffer);

  assertEquals(bytesRead, 21);
  assertEquals((decoded as PlteChunk).type, "PLTE");
  assertEquals((decoded as PlteChunk).data.colors.length, 3);
  assertEquals((decoded as PlteChunk).data.colors[0], [255, 0, 0]);
  assertEquals((decoded as PlteChunk).data.colors[1], [0, 255, 0]);
  assertEquals((decoded as PlteChunk).data.colors[2], [0, 0, 255]);
});

Deno.test("pngChunkRefined() - decodes unknown chunk type", () => {
  const coder = pngChunkRefined();
  // deno-fmt-ignore
  const buffer = new Uint8Array([
    0, 0, 0, 3, // length: 3
    88, 88, 88, 88, // type: "XXXX" (unknown)
    1, 2, 3, // data
    0, 0, 0, 1, // crc
  ]);

  const [decoded, bytesRead] = coder.decode(buffer);

  assertEquals(bytesRead, 15);
  assertEquals((decoded as PngChunkUnknown).length, 3);
  assertEquals((decoded as PngChunkUnknown).data, new Uint8Array([1, 2, 3]));
});

Deno.test("pngFile() - decodes complete PNG file with IHDR and IEND", () => {
  const coder = pngFile();
  // deno-fmt-ignore
  const buffer = new Uint8Array([
    ...PNG_SIGNATURE,
    // IHDR chunk
    0, 0, 0, 13, // length: 13
    73, 72, 68, 82, // type: "IHDR"
    0, 0, 0, 1, // width: 1
    0, 0, 0, 1, // height: 1
    8, // bitDepth: 8
    2, // colorType: 2 (truecolor)
    0, // compressionMethod: 0
    0, // filterMethod: 0
    0, // interlaceMethod: 0
    0x90, 0x77, 0x53, 0xDE, // crc
    // IEND chunk
    0, 0, 0, 0, // length: 0
    73, 69, 78, 68, // type: "IEND"
    0xAE, 0x42, 0x60, 0x82, // crc
  ]);

  const [decoded, bytesRead] = coder.decode(buffer);

  assertEquals(bytesRead, 8 + 25 + 12);
  assertEquals(decoded.signature, PNG_SIGNATURE_DECODED);
  assertEquals(decoded.chunks.length, 2);
  assertEquals((decoded.chunks[0] as IhdrChunk).type, "IHDR");
  assertEquals((decoded.chunks[1] as IendChunk).type, "IEND");
});

Deno.test("pngFile() - encodes complete PNG file", () => {
  const coder = pngFile();
  const pngData: PngFile<IhdrChunk | IendChunk> = {
    signature: PNG_SIGNATURE_DECODED,
    chunks: [
      {
        length: 13,
        type: "IHDR",
        data: {
          width: 1,
          height: 1,
          bitDepth: 8,
          colorType: 2,
          compressionMethod: 0,
          filterMethod: 0,
          interlaceMethod: 0,
        },
        crc: 0x907753DE,
      },
      {
        length: 0,
        type: "IEND",
        crc: 0xAE426082,
      },
    ],
  };

  const buffer = new Uint8Array(100);
  const bytesWritten = coder.encode(pngData, buffer);

  assertEquals(bytesWritten, 45);
  assertEquals(buffer.slice(0, 8), PNG_SIGNATURE);
});

Deno.test("pngFile() - round-trip with mixed chunk types", () => {
  const coder = pngFile();
  const uncompressed = new Uint8Array([1, 2, 3]);
  const compressedData = new Uint8Array(zlibSync(uncompressed));
  const pngData: PngFile<IhdrChunk | IdatChunk | IendChunk> = {
    signature: PNG_SIGNATURE_DECODED,
    chunks: [
      {
        length: 13,
        type: "IHDR",
        data: {
          width: 10,
          height: 20,
          bitDepth: 8,
          colorType: 2,
          compressionMethod: 0,
          filterMethod: 0,
          interlaceMethod: 0,
        },
        crc: 0x12345678,
      },
      {
        length: compressedData.length,
        type: "IDAT",
        data: {
          header: decodeHeader(Array.from(compressedData.subarray(0, 2))),
          uncompressed: uncompressed,
          checksum: compressedData.subarray(-4),
        },
        crc: 0x11223344,
      },
      {
        length: 0,
        type: "IEND",
        crc: 0xAE426082,
      },
    ],
  };

  const buffer = new Uint8Array(200);
  const bytesWritten = coder.encode(pngData, buffer);
  const [decoded, bytesRead] = coder.decode(buffer.subarray(0, bytesWritten));

  assertEquals(bytesRead, bytesWritten);
  assertEquals(decoded.signature, pngData.signature);
  assertEquals(decoded.chunks.length, 3);
  assertEquals((decoded.chunks[0] as IhdrChunk).type, "IHDR");
  assertEquals((decoded.chunks[1] as IdatChunk).type, "IDAT");
  assertEquals((decoded.chunks[2] as IendChunk).type, "IEND");
});

Deno.test("chunkCrc() - calculates CRC for raw bytes", () => {
  // deno-fmt-ignore
  const data = new Uint8Array([73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0]);
  const crc = chunkCrc(data);

  assertEquals(typeof crc, "number");
  assertGreaterOrEqual(crc, 0);
  assertEquals(crc, 0x907753DE);
});

Deno.test("chunkCrc() - calculates CRC for chunk object", () => {
  const chunk = {
    type: new Uint8Array([73, 72, 68, 82]), // "IHDR"
    // deno-fmt-ignore
    data: new Uint8Array([0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0]),
  };
  const crc = chunkCrc(chunk);

  assertEquals(typeof crc, "number");
  assertGreaterOrEqual(crc, 0);
  assertEquals(crc, 0x907753DE);
});

Deno.test("chunkCrc() - returns same CRC for equivalent data", () => {
  // deno-fmt-ignore
  const rawBytes = new Uint8Array([73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0]);
  const chunk = {
    type: new Uint8Array([73, 72, 68, 82]), // "IHDR"
    // deno-fmt-ignore
    data: new Uint8Array([0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0]),
  };

  assertEquals(chunkCrc(rawBytes), chunkCrc(chunk));
});

Deno.test("chunkCrc() - calculates CRC for IEND chunk", () => {
  const chunk = {
    type: new Uint8Array([73, 69, 78, 68]), // "IEND"
    data: new Uint8Array(0),
  };
  const crc = chunkCrc(chunk);

  assertEquals(crc, 0xAE426082);
});

Deno.test("chunkCrc() - different data produces different CRC", () => {
  const chunk1 = {
    type: new Uint8Array([73, 72, 68, 82]),
    data: new Uint8Array([1, 2, 3]),
  };
  const chunk2 = {
    type: new Uint8Array([73, 72, 68, 82]),
    data: new Uint8Array([4, 5, 6]),
  };

  const crc1 = chunkCrc(chunk1);
  const crc2 = chunkCrc(chunk2);

  assertEquals(crc1 !== crc2, true);
});
