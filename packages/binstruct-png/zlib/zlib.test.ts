import { assertEquals } from "@std/assert";
import { zlibSync } from "fflate";
import { zlibUncompressedCoder } from "./zlib.ts";
import { encode } from "@hertzg/binstruct";

Deno.test("zlibUncompressedCoder() - decodes zlib compressed data and extracts header fields", () => {
  const coder = zlibUncompressedCoder();

  const originalUncompressed = new TextEncoder().encode("Hello, PNG!");
  const originalCompressed = zlibSync(originalUncompressed);

  const [decoded, bytesRead] = coder.decode(originalCompressed);

  // Verify header fields were extracted
  assertEquals(
    decoded.header.compressionMethod,
    8,
    "Compression Method does not match",
  );
  assertEquals(
    decoded.header.compressionInfo,
    7,
    "Compression Info does not match",
  );
  assertEquals(
    decoded.header.fdict,
    0,
    "Dictionary should not be preset",
  );

  // Verify data was decompressed
  assertEquals(decoded.uncompressed, originalUncompressed);
  assertEquals(bytesRead, originalCompressed.length);
});

Deno.test("zlibUncompressedCoder() - validates real zlib compression", async (t) => {
  const coder = zlibUncompressedCoder();

  const originalUncompressed = new TextEncoder().encode(
    "abcccccccc",
  );

  // deno-fmt-ignore
  // fflate level to expected flevel mapping:
  // Level 0: flevel 0 (store)
  // Level 1-5: flevel 1 (fast)
  // Level 6-8: flevel 2 (default)
  // Level 9: flevel 3 (maximum)
  for (const { cLevel, fLevel } of [
    { cLevel: 0, fLevel: 0 },
    { cLevel: 1, fLevel: 1 },
    { cLevel: 2, fLevel: 1 },
    { cLevel: 3, fLevel: 1 },
    { cLevel: 4, fLevel: 1 },
    { cLevel: 5, fLevel: 1 },
    { cLevel: 6, fLevel: 2 },
    { cLevel: 7, fLevel: 2 },
    { cLevel: 8, fLevel: 2 },
    { cLevel: 9, fLevel: 3 },
  ]) {
    await t.step(`compression level ${cLevel}`, () => {
      const originalCompressed = zlibSync(originalUncompressed, {
        level: cLevel as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9,
      });

      const [decoded, bytesRead] = coder.decode(originalCompressed);

      assertEquals(decoded.header.compressionMethod, 8, 'Compression Method does not match');
      assertEquals(decoded.header.compressionInfo, 7, 'Compression Info does not match');
      assertEquals(decoded.header.fdict, 0, 'Dictionary should not be preset')
      assertEquals(decoded.header.flevel, fLevel, 'Compression Level does not match (flags)');

      assertEquals(bytesRead, originalCompressed.length);
      assertEquals(decoded.uncompressed, originalUncompressed, 'Decompressed data does not match');

      // Round-trip test - skip for levels 7 and 8 as they map to flevel 2
      // which re-encodes at level 6, producing different bytes
      if (cLevel !== 7 && cLevel !== 8) {
        const encoded = encode(coder, decoded);
        assertEquals(encoded, originalCompressed, 'Recompression did not produce the same bytes');
      }
    })
  }
});
