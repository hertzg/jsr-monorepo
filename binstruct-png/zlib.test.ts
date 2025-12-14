import { assertEquals } from "@std/assert";
import { promisify } from "node:util";
import { deflate, deflateRaw, inflateRaw } from "node:zlib";
import { zlibUncompressedCoder } from "./zlib.ts";

const deflateAsync = promisify(deflate);
const deflateRawAsync = promisify(deflateRaw);

/**
 * Maps zlib compression level (0-9) to RFC 1950 FLEVEL field (0-3).
 *
 * RFC 1950 FLEVEL encoding:
 * - 0: fastest algorithm
 * - 1: fast algorithm
 * - 2: default algorithm
 * - 3: maximum compression, slowest algorithm
 *
 * @param level - zlib compression level (0-9, or -1 for default)
 * @returns RFC 1950 FLEVEL value (0-3)
 */
function zlibLevelToFLevel(level: number): number {
  if (level === -1) return 2; // Z_DEFAULT_COMPRESSION
  if (level <= 1) return 0; // fastest
  if (level <= 5) return 1; // fast
  if (level === 6) return 2; // default
  return 3; // maximum (7–9)
}

Deno.test("zlibUncompressedCoder() - decodes zlib compressed data and extracts header fields", async () => {
  const coder = zlibUncompressedCoder();

  const originalData = new TextEncoder().encode("Hello, PNG!");
  const compressedBuffer = new Uint8Array(await deflateAsync(originalData));
  const compressed = new Uint8Array(compressedBuffer);

  const [decoded, bytesRead] = coder.decode(compressed);

  // Verify header fields were extracted
  assertEquals(decoded.header.compressionMethod, 8); // DEFLATE
  assertEquals(decoded.header.compressionInfo, 7); // 32K window

  // Verify data was decompressed
  assertEquals(decoded.uncompressed, originalData);
  assertEquals(bytesRead, compressed.length);
});

Deno.test("zlibUncompressedCoder() - validates real zlib compression", async (t) => {
  const coder = zlibUncompressedCoder();

  const originalData = new TextEncoder().encode(
    "@binstruct-png",
  );

  for (const compressionLevel of [-1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9]) {
    await t.step(`compression level ${compressionLevel}`, async () => {
      const original = new Uint8Array(
        await deflateAsync(originalData, {
          level: compressionLevel,
        }),
      );

      const [decoded, bytesRead] = coder.decode(original);

      assertEquals(decoded.header.compressionMethod, 8);
      assertEquals(decoded.header.compressionInfo, 7);

      assertEquals(
        decoded.header.compressionLevel,
        zlibLevelToFLevel(compressionLevel),
      );

      assertEquals(bytesRead, original.length);
      assertEquals(decoded.uncompressed, originalData);

      let encoded = new Uint8Array(4096);
      const bytesWritten = coder.encode(decoded, encoded);
      encoded = new Uint8Array(encoded.buffer, 0, bytesWritten);

      assertEquals(encoded, original);
    });
  }
});
