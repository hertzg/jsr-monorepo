import { createAssertSnapshot } from "@std/testing/snapshot";
import { pngFile } from "../mod.ts";
import { assertEquals, assertExists } from "@std/assert";
import { basename, join } from "node:path";

const assertSnapshot = createAssertSnapshot({
  serializer: (value) =>
    JSON.stringify(value, (_key, val) => {
      // Simplify Uint8Array representation in snapshots
      if (val instanceof Uint8Array) {
        return `[Uint8Array length=${val.length} ${
          Array.from(val).map((n) => n.toString(16).padStart(2, "0")).join("")
        }]`;
      }
      return val;
    }, 0),
});

const PNGSUITE_DIR = new URL(".", import.meta.url).pathname;

Deno.test("basic", async (t) => {
  // deno-fmt-ignore
  for (const {file, expected} of [
    // Non-interlaced PNGs
    { file: "./fixtures/basn0g01.png", expected: { interlaceMethod: 0, colorType: 0, bitDepth: 1, } }, // 1-bit grayscale
    { file: "./fixtures/basn0g02.png", expected: { interlaceMethod: 0, colorType: 0, bitDepth: 2, } }, // 2-bit grayscale
    { file: "./fixtures/basn0g04.png", expected: { interlaceMethod: 0, colorType: 0, bitDepth: 4, } }, // 4-bit grayscale
    { file: "./fixtures/basn0g08.png", expected: { interlaceMethod: 0, colorType: 0, bitDepth: 8, } }, // 8-bit grayscale
    { file: "./fixtures/basn0g16.png", expected: { interlaceMethod: 0, colorType: 0, bitDepth: 16, } }, // 16-bit grayscale
    { file: "./fixtures/basn2c08.png", expected: { interlaceMethod: 0, colorType: 2, bitDepth: 8, } }, // 8-bit RGB
    { file: "./fixtures/basn2c16.png", expected: { interlaceMethod: 0, colorType: 2, bitDepth: 16, } }, // 16-bit RGB
    { file: "./fixtures/basn3p01.png", expected: { interlaceMethod: 0, colorType: 3, bitDepth: 1, } }, // 1-bit palette
    { file: "./fixtures/basn3p02.png", expected: { interlaceMethod: 0, colorType: 3, bitDepth: 2, } }, // 2-bit palette
    { file: "./fixtures/basn3p04.png", expected: { interlaceMethod: 0, colorType: 3, bitDepth: 4, } }, // 4-bit palette
    { file: "./fixtures/basn3p08.png", expected: { interlaceMethod: 0, colorType: 3, bitDepth: 8, } }, // 8-bit palette
    { file: "./fixtures/basn4a08.png", expected: { interlaceMethod: 0, colorType: 4, bitDepth: 8, } }, // 8-bit grayscale with alpha
    { file: "./fixtures/basn4a16.png", expected: { interlaceMethod: 0, colorType: 4, bitDepth: 16, } }, // 16-bit grayscale with alpha
    { file: "./fixtures/basn6a08.png", expected: { interlaceMethod: 0, colorType: 6, bitDepth: 8, } }, // 8-bit RGBA
    { file: "./fixtures/basn6a16.png", expected: { interlaceMethod: 0, colorType: 6, bitDepth: 16, } }, // 16-bit RGBA
    
    // Interlaced PNGs
    { file: "./fixtures/basi0g01.png", expected: { interlaceMethod: 1, colorType: 0, bitDepth: 1, } }, // 1-bit grayscale
    { file: "./fixtures/basi0g02.png", expected: { interlaceMethod: 1, colorType: 0, bitDepth: 2, } }, // 2-bit grayscale
    { file: "./fixtures/basi0g04.png", expected: { interlaceMethod: 1, colorType: 0, bitDepth: 4, } }, // 4-bit grayscale
    { file: "./fixtures/basi0g08.png", expected: { interlaceMethod: 1, colorType: 0, bitDepth: 8, } }, // 8-bit grayscale
    { file: "./fixtures/basi0g16.png", expected: { interlaceMethod: 1, colorType: 0, bitDepth: 16, } }, // 16-bit grayscale
    
    { file: "./fixtures/basi2c08.png", expected: { interlaceMethod: 1, colorType: 2, bitDepth: 8, } }, // 8-bit RGB
    { file: "./fixtures/basi2c16.png", expected: { interlaceMethod: 1, colorType: 2, bitDepth: 16, } }, // 16-bit RGB

    { file: "./fixtures/basi3p01.png", expected: { interlaceMethod: 1, colorType: 3, bitDepth: 1, } }, // 1-bit palette
    { file: "./fixtures/basi3p02.png", expected: { interlaceMethod: 1, colorType: 3, bitDepth: 2, } }, // 2-bit palette
    { file: "./fixtures/basi3p04.png", expected: { interlaceMethod: 1, colorType: 3, bitDepth: 4, } }, // 4-bit palette
    { file: "./fixtures/basi3p08.png", expected: { interlaceMethod: 1, colorType: 3, bitDepth: 8, } }, // 8-bit palette

    { file: "./fixtures/basi4a08.png", expected: { interlaceMethod: 1, colorType: 4, bitDepth: 8, } }, // 8-bit grayscale with alpha
    { file: "./fixtures/basi4a16.png", expected: { interlaceMethod: 1, colorType: 4, bitDepth: 16, } }, // 16-bit grayscale with alpha

    { file: "./fixtures/basi6a08.png", expected: { interlaceMethod: 1, colorType: 6, bitDepth: 8, } }, // 8-bit RGBA
    { file: "./fixtures/basi6a16.png", expected: { interlaceMethod: 1, colorType: 6, bitDepth: 16, } }, // 16-bit RGBA
  ]) {

    
    await t.step(`${basename(file)} - interlace:${expected.interlaceMethod}, color:${expected.colorType}, bits:${expected.bitDepth}`, async (t) => {
      const bytes = await Deno.readFile(join(PNGSUITE_DIR, file));
      const [decoded] = pngFile().decode(bytes);

      await t.step(`IHDR chunk`, () => {
        const ihdr = decoded.chunks.find((c) => c.type === "IHDR");
        assertExists(ihdr, "IHDR chunk not found");

        assertEquals(ihdr.data.interlaceMethod, expected.interlaceMethod, "Unexpected interlace method");
        assertEquals(ihdr.data.colorType, expected.colorType, "Unexpected color type");
        assertEquals(ihdr.data.bitDepth, expected.bitDepth, "Unexpected bit depth");
      });

      await t.step(`snapshot`, async () => {
        await assertSnapshot(t, decoded);
      });
    });
  }
});

Deno.test(`compression`, async (t) => {
  for (
    const { file, expectedLevel } of [
      { file: "./fixtures/z00n2c08.png", expectedLevel: 0 },
      { file: "./fixtures/z03n2c08.png", expectedLevel: 1 },
      { file: "./fixtures/z06n2c08.png", expectedLevel: 2 },
      { file: "./fixtures/z09n2c08.png", expectedLevel: 3 },
    ]
  ) {
    await t.step(`${basename(file)} - level ${expectedLevel}`, async (t) => {
      const bytes = await Deno.readFile(join(PNGSUITE_DIR, file));

      const [decoded] = pngFile().decode(bytes);

      await t.step(`IHDR`, () => {
        const ihdr = decoded.chunks.find((c) => c.type === "IHDR");
        assertExists(ihdr, "IHDR chunk not found");
        assertEquals(
          ihdr.data.compressionMethod,
          0,
          "Unexpected compression method in IHDR chunk",
        );
      });

      await t.step(`IDAT zlibHeader fLevel`, () => {
        const idat = decoded.chunks.find((c) => c.type === "IDAT");
        assertExists(idat), "IDAT chunk not found";

        const actualLevel = idat.data.header.compressionLevel;
        assertEquals(
          actualLevel,
          expectedLevel,
          "Unexpected fLevel in zlib header of IDAT chunk",
        );
      });

      await t.step(`snapshot`, async () => {
        await assertSnapshot(t, decoded);
      });
    });
  }
});

Deno.test(`transparency (tRNS)`, async (t) => {
  await t.step(`basn3p08-trns.png - indexed color with transparency`, async (t) => {
    const bytes = await Deno.readFile(
      join(PNGSUITE_DIR, "./fixtures/basn3p08-trns.png"),
    );
    const [decoded] = pngFile().decode(bytes);

    await t.step(`IHDR chunk`, () => {
      const ihdr = decoded.chunks.find((c) => c.type === "IHDR");
      assertExists(ihdr, "IHDR chunk not found");
      assertEquals(ihdr.data.colorType, 3, "Expected indexed color type");
      assertEquals(ihdr.data.bitDepth, 8, "Expected 8-bit depth");
    });

    await t.step(`tRNS chunk exists`, () => {
      const trns = decoded.chunks.find((c) => c.type === "tRNS");
      assertExists(trns, "tRNS chunk not found");
      assertEquals(trns.type, "tRNS", "Chunk type should be tRNS");
    });

    await t.step(`tRNS chunk has alpha values`, () => {
      const trns = decoded.chunks.find((c) => c.type === "tRNS");
      assertExists(trns);
      assertEquals(trns.data.values.length, 173, "Expected 173 alpha values");
      assertEquals(Array.isArray(trns.data.values), true, "Values should be an array");
    });

    await t.step(`tRNS comes after PLTE and before IDAT`, () => {
      const plteIndex = decoded.chunks.findIndex((c) => c.type === "PLTE");
      const trnsIndex = decoded.chunks.findIndex((c) => c.type === "tRNS");
      const idatIndex = decoded.chunks.findIndex((c) => c.type === "IDAT");

      assertExists(plteIndex >= 0, "PLTE chunk should exist");
      assertExists(trnsIndex >= 0, "tRNS chunk should exist");
      assertExists(idatIndex >= 0, "IDAT chunk should exist");

      assertEquals(
        trnsIndex > plteIndex,
        true,
        "tRNS should come after PLTE",
      );
      assertEquals(
        trnsIndex < idatIndex,
        true,
        "tRNS should come before IDAT",
      );
    });

    await t.step(`snapshot`, async () => {
      await assertSnapshot(t, decoded);
    });
  });
});

Deno.test(`background (bKGD)`, async (t) => {
  for (
    const { file, colorType, bitDepth, expectedValues } of [
      { file: "./fixtures/bgbn4a08.png", colorType: 4, bitDepth: 8, expectedValues: [0, 0] }, // Grayscale black
      { file: "./fixtures/bggn4a16.png", colorType: 4, bitDepth: 16, expectedValues: [171, 132] }, // Grayscale gray
      { file: "./fixtures/bgwn6a08.png", colorType: 6, bitDepth: 8, expectedValues: [0, 255, 0, 255, 0, 255] }, // RGB white
      { file: "./fixtures/bgyn6a16.png", colorType: 6, bitDepth: 16, expectedValues: [255, 255, 255, 255, 0, 0] }, // RGB yellow
    ]
  ) {
    await t.step(`${basename(file)} - color:${colorType}, bits:${bitDepth}`, async (t) => {
      const bytes = await Deno.readFile(join(PNGSUITE_DIR, file));
      const [decoded] = pngFile().decode(bytes);

      await t.step(`IHDR chunk`, () => {
        const ihdr = decoded.chunks.find((c) => c.type === "IHDR");
        assertExists(ihdr, "IHDR chunk not found");
        assertEquals(ihdr.data.colorType, colorType, "Unexpected color type");
        assertEquals(ihdr.data.bitDepth, bitDepth, "Unexpected bit depth");
      });

      await t.step(`bKGD chunk`, () => {
        const bkgd = decoded.chunks.find((c) => c.type === "bKGD");
        assertExists(bkgd, "bKGD chunk not found");
        assertEquals(bkgd.type, "bKGD", "Chunk type should be bKGD");
        assertEquals(bkgd.data.values, expectedValues, "Unexpected background color values");
      });

      await t.step(`bKGD comes before IDAT`, () => {
        const bkgdIndex = decoded.chunks.findIndex((c) => c.type === "bKGD");
        const idatIndex = decoded.chunks.findIndex((c) => c.type === "IDAT");

        assertExists(bkgdIndex >= 0, "bKGD chunk should exist");
        assertExists(idatIndex >= 0, "IDAT chunk should exist");
        assertEquals(bkgdIndex < idatIndex, true, "bKGD should come before IDAT");
      });

      await t.step(`snapshot`, async () => {
        await assertSnapshot(t, decoded);
      });
    });
  }
});
