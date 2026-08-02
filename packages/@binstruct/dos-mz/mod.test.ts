import { assertEquals } from "@std/assert";
import {
  type DosMzHeader,
  dosMzHeader,
  MZ_HEADER_SIZE,
  MZ_OVERLAY_MAIN_PROGRAM,
  MZ_SIGNATURE,
} from "./mod.ts";

Deno.test("dosMzHeader", async (t) => {
  await t.step("round-trips a minimal header", () => {
    const coder = dosMzHeader();
    const header: DosMzHeader = {
      signature: MZ_SIGNATURE,
      lastPageBytes: 0x90,
      pageCount: 3,
      relocationCount: 0,
      headerParagraphs: 4,
      minExtraParagraphs: 0,
      maxExtraParagraphs: 0xffff,
      initialSS: 0,
      initialSP: 0xb8,
      checksum: 0,
      initialIP: 0,
      initialCS: 0,
      relocationTableOffset: 0x40,
      overlayNumber: MZ_OVERLAY_MAIN_PROGRAM,
      reserved1: new Uint8Array(8),
      oemIdentifier: 0,
      oemInfo: 0,
      reserved2: new Uint8Array(20),
      newHeaderOffset: 0x80,
    };

    const buffer = new Uint8Array(MZ_HEADER_SIZE);
    const written = coder.encode(header, buffer);
    const [decoded, read] = coder.decode(buffer);

    assertEquals(written, MZ_HEADER_SIZE);
    assertEquals(read, MZ_HEADER_SIZE);
    assertEquals(decoded, header);
  });

  await t.step("round-trips non-zero reserved and oem fields", () => {
    const coder = dosMzHeader();
    const header: DosMzHeader = {
      signature: MZ_SIGNATURE,
      lastPageBytes: 0x1a2b,
      pageCount: 0x3c4d,
      relocationCount: 12,
      headerParagraphs: 32,
      minExtraParagraphs: 16,
      maxExtraParagraphs: 512,
      initialSS: 0x1234,
      initialSP: 0x5678,
      checksum: 0xabcd,
      initialIP: 0x0100,
      initialCS: 0x0002,
      relocationTableOffset: 0x1c,
      overlayNumber: 7,
      reserved1: Uint8Array.from({ length: 8 }, (_, i) => i + 1),
      oemIdentifier: 0x1111,
      oemInfo: 0x2222,
      reserved2: Uint8Array.from({ length: 20 }, (_, i) => 20 - i),
      newHeaderOffset: 0x000001e0,
    };

    const buffer = new Uint8Array(MZ_HEADER_SIZE);
    const written = coder.encode(header, buffer);
    const [decoded, read] = coder.decode(buffer);

    assertEquals(written, MZ_HEADER_SIZE);
    assertEquals(read, MZ_HEADER_SIZE);
    assertEquals(decoded, header);
  });

  await t.step("decodes a known 64-byte MZ header", () => {
    // deno-fmt-ignore
    const wire = new Uint8Array([
      0x4d, 0x5a, // signature = "MZ"
      0x90, 0x00, // lastPageBytes
      0x03, 0x00, // pageCount
      0x00, 0x00, // relocationCount
      0x04, 0x00, // headerParagraphs
      0x00, 0x00, // minExtraParagraphs
      0xff, 0xff, // maxExtraParagraphs
      0x00, 0x00, // initialSS
      0xb8, 0x00, // initialSP
      0x00, 0x00, // checksum
      0x00, 0x00, // initialIP
      0x00, 0x00, // initialCS
      0x40, 0x00, // relocationTableOffset
      0x00, 0x00, // overlayNumber
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // reserved1
      0x00, 0x00, // oemIdentifier
      0x00, 0x00, // oemInfo
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, // reserved2
      0x80, 0x00, 0x00, 0x00, // newHeaderOffset
    ]);

    const [decoded, read] = dosMzHeader().decode(wire);

    assertEquals(read, MZ_HEADER_SIZE);
    assertEquals(decoded.signature, MZ_SIGNATURE);
    assertEquals(decoded.lastPageBytes, 0x90);
    assertEquals(decoded.pageCount, 3);
    assertEquals(decoded.maxExtraParagraphs, 0xffff);
    assertEquals(decoded.relocationTableOffset, 0x40);
    assertEquals(decoded.overlayNumber, MZ_OVERLAY_MAIN_PROGRAM);
    assertEquals(decoded.newHeaderOffset, 0x80);
    assertEquals(decoded.reserved1.length, 8);
    assertEquals(decoded.reserved2.length, 20);
  });

  await t.step("decodes a known header with a PE new header offset", () => {
    // deno-fmt-ignore
    const wire = new Uint8Array([
      0x4d, 0x5a, // signature = "MZ"
      0x80, 0x00, // lastPageBytes
      0x02, 0x00, // pageCount
      0x00, 0x00, // relocationCount
      0x04, 0x00, // headerParagraphs
      0x00, 0x00, // minExtraParagraphs
      0xff, 0xff, // maxExtraParagraphs
      0x00, 0x00, // initialSS
      0xb0, 0x00, // initialSP
      0x00, 0x00, // checksum
      0x00, 0x00, // initialIP
      0x00, 0x00, // initialCS
      0x40, 0x00, // relocationTableOffset
      0x00, 0x00, // overlayNumber
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // reserved1
      0x00, 0x00, // oemIdentifier
      0x00, 0x00, // oemInfo
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, // reserved2
      0x00, 0x01, 0x00, 0x00, // newHeaderOffset = 0x100
    ]);

    const [decoded, read] = dosMzHeader().decode(wire);

    assertEquals(read, MZ_HEADER_SIZE);
    assertEquals(decoded.newHeaderOffset, 0x100);
  });

  await t.step("signature encodes to the ASCII bytes MZ", () => {
    const buffer = new Uint8Array(MZ_HEADER_SIZE);
    dosMzHeader().encode({
      signature: MZ_SIGNATURE,
      lastPageBytes: 0,
      pageCount: 0,
      relocationCount: 0,
      headerParagraphs: 0,
      minExtraParagraphs: 0,
      maxExtraParagraphs: 0,
      initialSS: 0,
      initialSP: 0,
      checksum: 0,
      initialIP: 0,
      initialCS: 0,
      relocationTableOffset: 0,
      overlayNumber: 0,
      reserved1: new Uint8Array(8),
      oemIdentifier: 0,
      oemInfo: 0,
      reserved2: new Uint8Array(20),
      newHeaderOffset: 0,
    }, buffer);

    assertEquals(
      new TextDecoder().decode(buffer.subarray(0, 2)),
      "MZ",
    );
  });
});
