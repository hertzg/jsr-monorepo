import { assertEquals } from "@std/assert";
import { promisify } from "node:util";
import { deflate } from "node:zlib";
import { zlibUncompressedCoder } from "./zlib.ts";
import { encode } from "@hertzg/binstruct";

const deflateAsync = promisify(deflate);

Deno.test("zlibUncompressedCoder() - decodes zlib compressed data and extracts header fields", async () => {
  const coder = zlibUncompressedCoder();

  const originalUncompressed = new TextEncoder().encode("Hello, PNG!");
  const originalCompressed = new Uint8Array(
    await deflateAsync(originalUncompressed),
  );

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
    decoded.header.isDictionaryPresent,
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
  for (const { cLevel, fLevel } of [
    { cLevel: 0, fLevel: 0 },
    { cLevel: 1, fLevel: 0 },
    { cLevel: 2, fLevel: 1 },
    { cLevel: 3, fLevel: 1 },
    { cLevel: 4, fLevel: 1 },
    { cLevel: 5, fLevel: 1 },
    { cLevel: -1, fLevel: 2 },
    { cLevel: 6, fLevel: 2 },
    { cLevel: 7, fLevel: 3 },
    { cLevel: 8, fLevel: 3 },
    { cLevel: 9, fLevel: 3 },
  ]) {
    await t.step(`compression level ${cLevel}`, async () => {
      const originalCompressed = new Uint8Array(
        await deflateAsync(originalUncompressed, {
          level: cLevel,
        }),
      );

      const [decoded, bytesRead] = coder.decode(originalCompressed);

      assertEquals(decoded.header.compressionMethod, 8, 'Compression Method does not match');
      assertEquals(decoded.header.compressionInfo, 7, 'Compression Info does not match');
      assertEquals(decoded.header.isDictionaryPresent, 0, 'Dictionary should not be preset')
      assertEquals(decoded.header.compressionLevel, fLevel, 'Compression Level does not match (flags)');

      assertEquals(bytesRead, originalCompressed.length);
      assertEquals(decoded.uncompressed, originalUncompressed, 'Decompressed data does not match');

      // HACK: At CLEVEL 1 the recompression is non-deterministic. CLEVELS 0 and 1 both end up FLEVEL = 0
      if (cLevel !== 1) {
        const encoded = encode(coder, decoded);
        assertEquals(encoded, originalCompressed, 'Recompression did not produce the same bytes');
      }
    })
  }
});
