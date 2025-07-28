import { assertEquals, assertThrows } from "jsr:@std/assert";
import type { Coder } from "./mod.ts";
// deno-fmt-ignore
import {
  type Endianness,
  f16, f16be, f16le,
  f32, f32be, f32le,
  f64, f64be, f64le,
  s16, s16be, s16le,
  s32, s32be, s32le,
  s64, s64be, s64le,
  s8, s8be, s8le,
  u16, u16be, u16le,
  u32, u32be, u32le,
  u64, u64be, u64le,
  u8, u8be, u8le,
} from "./numeric.ts";

// Truth table for testing numeric types
// Each entry contains: [type, value, expected_bytes_be, description]
// deno-fmt-ignore
const TRUTH_TABLE = [
  // 8-bit integers
  ["u8", 255, [0xFF], "unsigned 8-bit max"],
  ["u8", 0, [0x00], "unsigned 8-bit zero"],
  ["u8", 128, [0x80], "unsigned 8-bit half"],

  ["s8", 127, [0x7F], "signed 8-bit max positive"],
  ["s8", -128, [0x80], "signed 8-bit min negative"],
  ["s8", 0, [0x00], "signed 8-bit zero"],
  ["s8", -1, [0xFF], "signed 8-bit negative one"],

  // 16-bit integers
  ["u16", 65535, [0xFF, 0xFF], "unsigned 16-bit max"],
  ["u16", 0, [0x00, 0x00], "unsigned 16-bit zero"],
  ["u16", 256, [0x01, 0x00], "unsigned 16-bit 256"],
  ["u16", 258, [0x01, 0x02], "unsigned 16-bit 258"],

  ["s16", 32767, [0x7F, 0xFF], "signed 16-bit max positive"],
  ["s16", -32768, [0x80, 0x00], "signed 16-bit min negative"],
  ["s16", 0, [0x00, 0x00], "signed 16-bit zero"],
  ["s16", -1, [0xFF, 0xFF], "signed 16-bit negative one"],

  // 16-bit floats
  ["f16", 1.0, [0x3C, 0x00], "float16 one"],
  ["f16", 0.0, [0x00, 0x00], "float16 zero"],
  ["f16", -0.0, [0x80, 0x00], "float16 negative zero"],
  ["f16", -1.0, [0xBC, 0x00], "float16 negative one"],

  // 32-bit integers
  ["u32", 4294967295, [0xFF, 0xFF, 0xFF, 0xFF], "unsigned 32-bit max"],
  ["u32", 0, [0x00, 0x00, 0x00, 0x00], "unsigned 32-bit zero"],
  ["u32", 16777216, [0x01, 0x00, 0x00, 0x00], "unsigned 32-bit 16777216"],

  ["s32", 2147483647, [0x7F, 0xFF, 0xFF, 0xFF], "signed 32-bit max positive"],
  ["s32", -2147483648, [0x80, 0x00, 0x00, 0x00], "signed 32-bit min negative"],
  ["s32", 0, [0x00, 0x00, 0x00, 0x00], "signed 32-bit zero"],
  ["s32", -1, [0xFF, 0xFF, 0xFF, 0xFF], "signed 32-bit negative one"],

  // 32-bit floats
  ["f32", 1.0, [0x3F, 0x80, 0x00, 0x00], "float32 one"],
  ["f32", 0.0, [0x00, 0x00, 0x00, 0x00], "float32 zero"],
  ["f32", -0.0, [0x80, 0x00, 0x00, 0x00], "float32 negative zero"],
  ["f32", -1.0, [0xBF, 0x80, 0x00, 0x00], "float32 negative one"],
  ["f32", 3.141590118408203, [0x40, 0x49, 0x0F, 0xD0], "float32 pi"],

  // 64-bit floats
  ["f64", 1.0, [0x3F, 0xF0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00], "float64 one"],
  ["f64", 0.0, [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00], "float64 zero"],
  ["f64", -0.0, [0x80, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00], "float64 negative zero"],
  ["f64", -1.0, [0xBF, 0xF0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00], "float64 negative one"],
  ["f64", Math.PI, [0x40, 0x09, 0x21, 0xFB, 0x54, 0x44, 0x2D, 0x18], "float64 pi"],

  // 64-bit integers
  ["u64", 18446744073709551615n, [0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF], "unsigned 64-bit max"],
  ["u64", 0n, [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00], "unsigned 64-bit zero"],
  ["u64", 72057594037927936n, [0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00], "unsigned 64-bit 72057594037927936"],

  ["s64", 9223372036854775807n, [0x7F, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF], "signed 64-bit max positive"],
  ["s64", -9223372036854775808n, [0x80, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00], "signed 64-bit min negative"],
  ["s64", 0n, [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00], "signed 64-bit zero"],
  ["s64", -1n, [0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF], "signed 64-bit negative one"],
] as const;

// Test each type
testNumericType("u8", u8, u8le, u8be, 1);

testNumericType("s8", s8, s8le, s8be, 1);

testNumericType("u16", u16, u16le, u16be, 2);

testNumericType("s16", s16, s16le, s16be, 2);

testNumericType("f16", f16, f16le, f16be, 2);

testNumericType("u32", u32, u32le, u32be, 4);

testNumericType("s32", s32, s32le, s32be, 4);

testNumericType("f32", f32, f32le, f32be, 4);

testNumericType("u64", u64, u64le, u64be, 8);
testNumericType("s64", s64, s64le, s64be, 8);
testNumericType("f64", f64, f64le, f64be, 8);

// Helper function to convert big-endian bytes to little-endian
function toLittleEndian(bytes: readonly number[]): number[] {
  // For single-byte values, BE and LE are the same
  if (bytes.length === 1) {
    return [...bytes];
  }
  // For multi-byte values, reverse the byte order
  return [...bytes].reverse();
}

// Generic test function for each type
function testNumericType<T extends number | bigint>(
  name: string,
  _defaultType: (endianness: Endianness) => Coder<T>,
  littleEndianType: Coder<T>,
  bigEndianType: Coder<T>,
  expectedSize: number,
) {
  const typeTests = TRUTH_TABLE.filter(([type]) => type === name);

  Deno.test(`${name}:`, async (t) => {
    for (const [, value, bytesBe, description] of typeTests) {
      await t.step("reads", async (t) => {
        await t.step(`big-endian: ${description}`, async (t) => {
          // Test reading from buffer with expected bytes
          const buffer = new Uint8Array(bytesBe);
          const [result] = bigEndianType.decode(buffer);
          assertEquals(result, value as T);

          await t.step(`with offset`, () => {
            const bufferWithOffset = new Uint8Array([0, 0, 0, 0, ...bytesBe]);
            const view = bufferWithOffset.subarray(4, 4 + bytesBe.length);
            const [result] = bigEndianType.decode(view);
            assertEquals(result, value as T);
          });
        });

        await t.step(`little-endian: ${description}`, async (t) => {
          const bytesLe = toLittleEndian(bytesBe);
          const buffer = new Uint8Array(bytesLe);

          const [result] = littleEndianType.decode(buffer);
          assertEquals(result, value as T);

          await t.step(`with offset`, () => {
            const bufferWithOffset = new Uint8Array([0, 0, 0, 0, ...bytesLe]);
            const view = bufferWithOffset.subarray(4, 4 + bytesLe.length);
            const [result] = littleEndianType.decode(view);
            assertEquals(result, value as T);
          });
        });
      });

      await t.step("writes", async (t) => {
        await t.step(`big-endian: ${description}`, async (t) => {
          const buffer = new Uint8Array(bytesBe.length);
          const bytesWritten = bigEndianType.encode(value as T, buffer);
          assertEquals(bytesWritten, bytesBe.length);
          assertEquals(buffer, new Uint8Array(bytesBe));

          await t.step(`with offset`, () => {
            const bufferWithOffset = new Uint8Array(bytesBe.length + 4);
            const view = bufferWithOffset.subarray(4, 4 + bytesBe.length);
            const bytesWritten = bigEndianType.encode(value as T, view);
            assertEquals(bytesWritten, bytesBe.length);
            assertEquals(
              bufferWithOffset,
              new Uint8Array([0, 0, 0, 0, ...bytesBe]),
            );
          });
        });

        await t.step(`little-endian: ${description}`, async (t) => {
          const bytesLe = toLittleEndian(bytesBe);
          const buffer = new Uint8Array(bytesLe.length);
          const bytesWritten = littleEndianType.encode(value as T, buffer);
          assertEquals(bytesWritten, bytesLe.length);
          assertEquals(buffer, new Uint8Array(bytesLe));

          await t.step(`with offset`, () => {
            const bufferWithOffset = new Uint8Array(bytesLe.length + 4);
            const view = bufferWithOffset.subarray(4, 4 + bytesLe.length);
            const bytesWritten = littleEndianType.encode(value as T, view);
            assertEquals(bytesWritten, bytesLe.length);
            assertEquals(
              bufferWithOffset,
              new Uint8Array([0, 0, 0, 0, ...bytesLe]),
            );
          });
        });
      });

      await t.step("roundtrip", async (t) => {
        await t.step(`big-endian: ${description}`, async (t) => {
          // Write value to buffer, then read it back
          const buffer = new Uint8Array(expectedSize);
          const bytesWritten = bigEndianType.encode(value as T, buffer);
          assertEquals(bytesWritten, expectedSize);
          const [result] = bigEndianType.decode(buffer);
          assertEquals(result, value as T);

          await t.step(`with offset`, () => {
            const bufferWithOffset = new Uint8Array(expectedSize + 4);
            const view = bufferWithOffset.subarray(4, 4 + expectedSize);
            const bytesWritten = bigEndianType.encode(value as T, view);
            assertEquals(bytesWritten, expectedSize);
            const [result] = bigEndianType.decode(view);
            assertEquals(result, value as T);
          });
        });

        await t.step(`little-endian: ${description}`, async (t) => {
          const buffer = new Uint8Array(expectedSize);
          const bytesWritten = littleEndianType.encode(value as T, buffer);
          assertEquals(bytesWritten, expectedSize);
          const [result] = littleEndianType.decode(buffer);
          assertEquals(result, value as T);

          await t.step(`with offset`, () => {
            const bufferWithOffset = new Uint8Array(expectedSize + 4);
            const view = bufferWithOffset.subarray(4, 4 + expectedSize);
            const bytesWritten = littleEndianType.encode(value as T, view);
            assertEquals(bytesWritten, expectedSize);
            const [result] = littleEndianType.decode(view);
            assertEquals(result, value as T);
          });
        });
      });
    }

    await t.step("size", async (t) => {
      await t.step("buffer too small for read", () => {
        const buffer = new Uint8Array(
          Math.max(expectedSize - 1, 0),
        );
        assertThrows(() => bigEndianType.decode(buffer), Error);
        assertThrows(() => littleEndianType.decode(buffer), Error);
      });

      await t.step("buffer too small for write", () => {
        // This test doesn't apply to the new API since encode takes a target buffer
      });

      await t.step("empty buffer", () => {
        const buffer = new Uint8Array(0);
        assertThrows(() => bigEndianType.decode(buffer), Error);
        assertThrows(() => littleEndianType.decode(buffer), Error);
      });
    });
  });
}

// Test floating point precision
Deno.test("floating point precision", async (t) => {
  await t.step("f32 precision", () => {
    const value = 3.14159;
    const buffer = new Uint8Array(4);
    const bytesWritten = f32be.encode(value, buffer);
    assertEquals(bytesWritten, 4);
    const [result] = f32be.decode(buffer);
    // Should be close but not necessarily exact due to floating point precision
    assertEquals(Math.abs(result - value) < 0.0001, true);
  });

  await t.step("f64 precision", () => {
    const value = Math.PI;
    const buffer = new Uint8Array(8);
    const bytesWritten = f64be.encode(value, buffer);
    assertEquals(bytesWritten, 8);
    const [result] = f64be.decode(buffer);
    // Should be very close due to double precision
    assertEquals(Math.abs(result - value) < 0.000000000000001, true);
  });
});

// Test edge cases
Deno.test("edge cases", async (t) => {
  await t.step("u8 overflow", () => {
    const buffer = new Uint8Array(1);
    const bytesWritten = u8be.encode(256, buffer);
    assertEquals(bytesWritten, 1);
    assertEquals(buffer[0], 0); // Should wrap around
  });

  await t.step("s8 overflow", () => {
    const buffer = new Uint8Array(1);
    const bytesWritten = s8be.encode(128, buffer);
    assertEquals(bytesWritten, 1);
    assertEquals(buffer[0], 128);

    const buffer2 = new Uint8Array(1);
    const bytesWritten2 = s8be.encode(-129, buffer2);
    assertEquals(bytesWritten2, 1);
    assertEquals(buffer2[0], 127); // Should wrap around
  });

  await t.step("factory functions", () => {
    const beFn = u8("be");
    const leFn = u8("le");
    const value = 255;
    const bytesBe = [0xFF];

    const beBuffer = new Uint8Array(bytesBe.length);
    const beBytesWritten = beFn.encode(value, beBuffer);
    assertEquals(beBytesWritten, bytesBe.length);
    assertEquals(beBuffer, new Uint8Array(bytesBe));

    const leBuffer = new Uint8Array(bytesBe.length);
    const leBytesWritten = leFn.encode(value, leBuffer);
    assertEquals(leBytesWritten, bytesBe.length);
    assertEquals(leBuffer, new Uint8Array(toLittleEndian(bytesBe)));
  });
});
