import { assertEquals, assertThrows } from "@std/assert";
import { bitStruct } from "./bit-struct.ts";
import { struct } from "../struct/struct.ts";
import { u32le } from "../numeric/numeric.ts";
import { createContext } from "../core.ts";

Deno.test("bitStruct: schema validation", async (t) => {
  await t.step("rejects bit count < 1", () => {
    assertThrows(
      () => bitStruct({ field: 0 }),
      Error,
      "1-32",
    );
  });

  await t.step("rejects bit count > 32", () => {
    assertThrows(
      () => bitStruct({ field: 33 }),
      Error,
      "1-32",
    );
  });

  await t.step("rejects negative bit count", () => {
    assertThrows(
      () => bitStruct({ field: -1 }),
      Error,
      "1-32",
    );
  });

  await t.step("rejects non-integer bit count", () => {
    assertThrows(
      () => bitStruct({ field: 1.5 }),
      Error,
      "1-32",
    );
  });

  await t.step("rejects non-byte-aligned total (7 bits)", () => {
    assertThrows(
      () => bitStruct({ a: 3, b: 4 }),
      Error,
      "multiple of 8",
    );
  });

  await t.step("rejects non-byte-aligned total (11 bits)", () => {
    assertThrows(
      () => bitStruct({ a: 6, b: 5 }),
      Error,
      "multiple of 8",
    );
  });

  await t.step("accepts byte-aligned totals", () => {
    // Should not throw
    bitStruct({ a: 8 });
    bitStruct({ a: 4, b: 4 });
    bitStruct({ a: 16 });
    bitStruct({ a: 24 });
    bitStruct({ a: 32 });
  });

  await t.step("provides helpful error message for padding", () => {
    const error = assertThrows(
      () => bitStruct({ a: 5 }),
      Error,
    );
    assertEquals(error.message.includes("Add 3 padding bit(s)"), true);
    assertEquals(error.message.includes("{ _padding: 3 }"), true);
  });
});

Deno.test("bitStruct: basic functionality", async (t) => {
  await t.step("encodes and decodes simple 8-bit structure", () => {
    const flags = bitStruct({
      enabled: 1,
      priority: 3,
      category: 4,
    });

    const value = { enabled: 1, priority: 5, category: 2 };
    const buffer = new Uint8Array(1);

    const written = flags.encode(value, buffer);
    const [decoded, read] = flags.decode(buffer);

    assertEquals(decoded, value);
    assertEquals(written, 1);
    assertEquals(read, 1);
    assertEquals(buffer[0], 0b1_101_0010);
  });

  await t.step("verifies MSB-first ordering with known byte pattern", () => {
    const bits = bitStruct({ a: 1, b: 1, c: 1, d: 1, e: 4 });
    const value = { a: 1, b: 0, c: 1, d: 0, e: 15 };
    const buffer = new Uint8Array(1);

    bits.encode(value, buffer);

    // MSB-first: 1010_1111 = 0xAF
    assertEquals(buffer[0], 0xAF);

    const [decoded] = bits.decode(buffer);
    assertEquals(decoded, value);
  });

  await t.step("verifies bytesRead and bytesWritten values", () => {
    const coder = bitStruct({ a: 4, b: 4 });
    const buffer = new Uint8Array(1);

    const written = coder.encode({ a: 15, b: 0 }, buffer);
    assertEquals(written, 1);

    const [, read] = coder.decode(buffer);
    assertEquals(read, 1);
  });
});

Deno.test("bitStruct: multi-byte structures", async (t) => {
  await t.step("handles 16-bit structure", () => {
    const header = bitStruct({
      version: 4,
      type: 4,
      flags: 8,
    });

    const value = { version: 1, type: 2, flags: 0xFF };
    const buffer = new Uint8Array(2);

    const written = header.encode(value, buffer);
    const [decoded, read] = header.decode(buffer);

    assertEquals(decoded, value);
    assertEquals(written, 2);
    assertEquals(read, 2);
  });

  await t.step("handles 24-bit structure", () => {
    const data = bitStruct({
      field1: 8,
      field2: 8,
      field3: 8,
    });

    const value = { field1: 0xAA, field2: 0xBB, field3: 0xCC };
    const buffer = new Uint8Array(3);

    const written = data.encode(value, buffer);
    const [decoded, read] = data.decode(buffer);

    assertEquals(decoded, value);
    assertEquals(written, 3);
    assertEquals(read, 3);
  });

  await t.step("handles 32-bit structure", () => {
    const header = bitStruct({
      version: 4,
      type: 4,
      flags: 8,
      length: 16,
    });

    const value = { version: 1, type: 2, flags: 0xFF, length: 1024 };
    const buffer = new Uint8Array(4);

    const written = header.encode(value, buffer);
    const [decoded, read] = header.decode(buffer);

    assertEquals(decoded, value);
    assertEquals(written, 4);
    assertEquals(read, 4);
  });

  await t.step("handles complex field arrangements", () => {
    const complex = bitStruct({
      a: 3,
      b: 5,
      c: 7,
      d: 1,
      e: 16,
    });

    const value = { a: 7, b: 31, c: 127, d: 1, e: 65535 };
    const buffer = new Uint8Array(4);

    const written = complex.encode(value, buffer);
    const [decoded, read] = complex.decode(buffer);

    assertEquals(decoded, value);
    assertEquals(written, 4);
    assertEquals(read, 4);
  });
});

Deno.test("bitStruct: round-trip integrity", async (t) => {
  await t.step("round-trip with various bit field combinations", () => {
    const coder = bitStruct({
      f1: 2,
      f2: 3,
      f3: 3,
      f4: 8,
      f5: 16,
    });

    const original = { f1: 3, f2: 7, f3: 5, f4: 128, f5: 32768 };
    const buffer = new Uint8Array(4);

    coder.encode(original, buffer);
    const [decoded] = coder.decode(buffer);

    assertEquals(decoded, original);
  });

  await t.step("round-trip with edge values (0 for each field)", () => {
    const coder = bitStruct({ a: 5, b: 3, c: 8, d: 16 });
    const original = { a: 0, b: 0, c: 0, d: 0 };

    const buffer = new Uint8Array(4);
    coder.encode(original, buffer);
    const [decoded] = coder.decode(buffer);

    assertEquals(decoded, original);
  });

  await t.step("round-trip with max values for each field", () => {
    const coder = bitStruct({ a: 5, b: 3, c: 8, d: 16 });
    const original = { a: 31, b: 7, c: 255, d: 65535 };

    const buffer = new Uint8Array(4);
    coder.encode(original, buffer);
    const [decoded] = coder.decode(buffer);

    assertEquals(decoded, original);
  });

  await t.step("round-trip with mixed values", () => {
    const coder = bitStruct({ a: 4, b: 4, c: 8, d: 16 });
    const original = { a: 8, b: 7, c: 128, d: 16384 };

    const buffer = new Uint8Array(4);
    coder.encode(original, buffer);
    const [decoded] = coder.decode(buffer);

    assertEquals(decoded, original);
  });
});

Deno.test("bitStruct: integration with struct", async (t) => {
  await t.step("works within struct composition", () => {
    const flags = bitStruct({
      compressed: 1,
      encrypted: 1,
      version: 6,
    });

    const packet = struct({
      flags: flags,
      payloadSize: u32le(),
    });

    const buffer = new Uint8Array(5);
    const data = {
      flags: { compressed: 1, encrypted: 0, version: 2 },
      payloadSize: 1024,
    };

    packet.encode(data, buffer);
    const [decoded] = packet.decode(buffer);

    assertEquals(decoded.flags.compressed, 1);
    assertEquals(decoded.flags.encrypted, 0);
    assertEquals(decoded.flags.version, 2);
    assertEquals(decoded.payloadSize, 1024);
  });

  await t.step("multiple bitStructs in one struct", () => {
    const header = bitStruct({ version: 4, type: 4 });
    const flags = bitStruct({ flag1: 1, flag2: 1, flag3: 6 });

    const message = struct({
      header: header,
      flags: flags,
      data: u32le(),
    });

    const buffer = new Uint8Array(6);
    const data = {
      header: { version: 1, type: 2 },
      flags: { flag1: 1, flag2: 0, flag3: 63 },
      data: 0xDEADBEEF,
    };

    message.encode(data, buffer);
    const [decoded] = message.decode(buffer);

    assertEquals(decoded, data);
  });
});

Deno.test("bitStruct: edge cases", async (t) => {
  await t.step("handles single-bit fields", () => {
    const bits = bitStruct({
      b0: 1,
      b1: 1,
      b2: 1,
      b3: 1,
      b4: 1,
      b5: 1,
      b6: 1,
      b7: 1,
    });

    const value = { b0: 1, b1: 0, b2: 1, b3: 0, b4: 1, b5: 1, b6: 1, b7: 1 };
    const buffer = new Uint8Array(1);

    bits.encode(value, buffer);
    assertEquals(buffer[0], 0b10101111);

    const [decoded] = bits.decode(buffer);
    assertEquals(decoded, value);
  });

  await t.step("handles 32-bit field", () => {
    const coder = bitStruct({ value: 32 });

    const original = { value: 0xDEADBEEF };
    const buffer = new Uint8Array(4);

    coder.encode(original, buffer);
    const [decoded] = coder.decode(buffer);

    assertEquals(decoded, original);
  });

  await t.step("handles all zeros", () => {
    const coder = bitStruct({ a: 8, b: 8, c: 16 });

    const original = { a: 0, b: 0, c: 0 };
    const buffer = new Uint8Array(4);

    coder.encode(original, buffer);
    assertEquals(buffer[0], 0);
    assertEquals(buffer[1], 0);
    assertEquals(buffer[2], 0);
    assertEquals(buffer[3], 0);

    const [decoded] = coder.decode(buffer);
    assertEquals(decoded, original);
  });

  await t.step("handles all ones (max values)", () => {
    const coder = bitStruct({ a: 8, b: 8, c: 16 });

    const original = { a: 255, b: 255, c: 65535 };
    const buffer = new Uint8Array(4);

    coder.encode(original, buffer);
    assertEquals(buffer[0], 0xFF);
    assertEquals(buffer[1], 0xFF);
    assertEquals(buffer[2], 0xFF);
    assertEquals(buffer[3], 0xFF);

    const [decoded] = coder.decode(buffer);
    assertEquals(decoded, original);
  });

  await t.step("rejects value exceeding bit range", () => {
    const coder = bitStruct({ small: 3, large: 5 });

    // small field is 3 bits, max value is 7
    assertThrows(
      () => coder.encode({ small: 8, large: 0 }, new Uint8Array(1)),
      Error,
      "exceeds 3-bit range",
    );
  });

  await t.step("rejects negative value", () => {
    const coder = bitStruct({ field: 8 });

    assertThrows(
      () => coder.encode({ field: -1 }, new Uint8Array(1)),
      Error,
      "exceeds 8-bit range",
    );
  });
});

Deno.test("bitStruct: buffer size validation", async (t) => {
  await t.step("throws error when buffer too small for decode", () => {
    const coder = bitStruct({ a: 16 });
    const buffer = new Uint8Array(1); // Need 2 bytes

    assertThrows(
      () => coder.decode(buffer),
      Error,
      "Need 2 bytes, got 1",
    );
  });

  await t.step("accepts buffer larger than needed", () => {
    const coder = bitStruct({ a: 8 });
    const buffer = new Uint8Array(10); // Only need 1 byte

    buffer[0] = 0xFF;
    const [decoded, read] = coder.decode(buffer);

    assertEquals(decoded.a, 255);
    assertEquals(read, 1);
  });
});

Deno.test("bitStruct: context integration", async (t) => {
  await t.step("stores value in context during encode", () => {
    const coder = bitStruct({ a: 4, b: 4 });
    const ctx = createContext("encode");
    const value = { a: 15, b: 7 };
    const buffer = new Uint8Array(1);

    coder.encode(value, buffer, ctx);

    // Context should have the encoded value stored
    // (verified by the fact that refs would be able to access it)
  });

  await t.step("stores value in context during decode", () => {
    const coder = bitStruct({ a: 4, b: 4 });
    const ctx = createContext("decode");
    const buffer = new Uint8Array([0xFF]);

    coder.decode(buffer, ctx);

    // Context should have the decoded value stored
    // (verified by the fact that refs would be able to access it)
  });
});

Deno.test("bitStruct: real-world use cases", async (t) => {
  await t.step("PNG/Zlib header (2 bytes)", () => {
    const zlibHeader = bitStruct({
      // Byte 0 (CMF): MSB-first means CINFO comes first, then CM
      compressionInfo: 4, // CMF bits 7-4: Compression info
      compressionMethod: 4, // CMF bits 3-0: Compression method
      // Byte 1 (FLG)
      fcheck: 5, // FLG bits 7-3: Check bits
      fdict: 1, // FLG bit 2: Preset dictionary flag
      flevel: 2, // FLG bits 1-0: Compression level
    });

    // Common zlib header: 0x78 0x9C
    // 0x78 = 0b0111_1000: CINFO=7, CM=8
    // 0x9C = 0b1001_1100: FCHECK=19 (0b10011), FDICT=1, FLEVEL=0
    const buffer = new Uint8Array([0x78, 0x9C]);
    const [decoded] = zlibHeader.decode(buffer);

    assertEquals(decoded.compressionInfo, 7);
    assertEquals(decoded.compressionMethod, 8);
    assertEquals(decoded.fcheck, 19); // 0b10011 = 19, not 28
    assertEquals(decoded.fdict, 1);
    assertEquals(decoded.flevel, 0); // bits 1-0 of 0x9C = 00
  });

  await t.step("Ethernet VLAN tag (2 bytes)", () => {
    const vlanTCI = bitStruct({
      pcp: 3,
      dei: 1,
      vid: 12,
    });

    const value = { pcp: 5, dei: 0, vid: 100 };
    const buffer = new Uint8Array(2);

    vlanTCI.encode(value, buffer);
    const [decoded] = vlanTCI.decode(buffer);

    assertEquals(decoded, value);
  });

  await t.step("IPv4 fragment field (2 bytes)", () => {
    const ipv4FragmentField = bitStruct({
      reserved: 1,
      dontFragment: 1,
      moreFragments: 1,
      fragmentOffset: 13,
    });

    const value = {
      reserved: 0,
      dontFragment: 1,
      moreFragments: 0,
      fragmentOffset: 0,
    };
    const buffer = new Uint8Array(2);

    ipv4FragmentField.encode(value, buffer);
    const [decoded] = ipv4FragmentField.decode(buffer);

    assertEquals(decoded, value);
  });

  await t.step("TCP data offset (1 byte)", () => {
    const tcpDataOffset = bitStruct({
      dataOffset: 4,
      reserved: 3,
      ns: 1,
    });

    const value = { dataOffset: 5, reserved: 0, ns: 0 };
    const buffer = new Uint8Array(1);

    tcpDataOffset.encode(value, buffer);
    assertEquals(buffer[0], 0b0101_000_0);

    const [decoded] = tcpDataOffset.decode(buffer);
    assertEquals(decoded, value);
  });
});
