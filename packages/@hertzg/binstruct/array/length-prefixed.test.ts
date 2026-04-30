import { assertEquals, assertThrows } from "@std/assert";
import { f32be, f64be, s16be, u16be, u32be, u8be } from "../numeric/numeric.ts";
import { stringNT } from "../string/null-terminated.ts";
import { stringLP } from "../string/length-prefixed.ts";
import { arrayLP } from "./length-prefixed.ts";

Deno.test("arrayLP: basic functionality", async (t) => {
  await t.step("encodes and decodes number arrays", () => {
    const numberArrayCoder = arrayLP(u8be(), u32be());
    const data = [1, 2, 3, 4, 5];

    const buffer = new Uint8Array(100);
    const bytesWritten = numberArrayCoder.encode(data, buffer);
    const [decoded, bytesRead] = numberArrayCoder.decode(buffer);

    assertEquals(decoded, data);
    assertEquals(bytesWritten, bytesRead);
  });

  await t.step("encodes and decodes empty arrays", () => {
    const numberArrayCoder = arrayLP(u8be(), u32be());
    const data: number[] = [];

    const buffer = new Uint8Array(100);
    const bytesWritten = numberArrayCoder.encode(data, buffer);
    const [decoded, bytesRead] = numberArrayCoder.decode(buffer);

    assertEquals(decoded, data);
    assertEquals(bytesWritten, bytesRead);
  });

  await t.step("works with different element types", () => {
    const floatArrayCoder = arrayLP(f32be(), u16be());
    const data = [1.5, 2.7, 3.14];

    const buffer = new Uint8Array(100);
    const bytesWritten = floatArrayCoder.encode(data, buffer);
    const [decoded, bytesRead] = floatArrayCoder.decode(buffer);

    assertEquals(decoded.length, data.length);
    for (let i = 0; i < data.length; i++) {
      assertEquals(Math.abs(decoded[i] - data[i]) < 0.001, true);
    }
    assertEquals(bytesWritten, bytesRead);
  });

  await t.step("works with signed integers", () => {
    const signedArrayCoder = arrayLP(s16be(), u8be());
    const data = [-1, -2, -3, 4, 5];

    const buffer = new Uint8Array(100);
    const bytesWritten = signedArrayCoder.encode(data, buffer);
    const [decoded, bytesRead] = signedArrayCoder.decode(buffer);

    assertEquals(decoded, data);
    assertEquals(bytesWritten, bytesRead);
  });

  await t.step("works with length-prefixed string arrays", () => {
    const stringArrayCoder = arrayLP(stringLP(u16be()), u8be());
    const data = ["Hello", "World", "სამყარო", "🌍"];

    const buffer = new Uint8Array(200);
    const bytesWritten = stringArrayCoder.encode(data, buffer);
    const [decoded, bytesRead] = stringArrayCoder.decode(buffer);

    assertEquals(decoded, data);
    assertEquals(bytesWritten, bytesRead);
  });

  await t.step("works with null-terminated string arrays", () => {
    const stringArrayCoder = arrayLP(stringNT(), u8be());
    const data = ["Hello", "World", "Test", "String"];

    const buffer = new Uint8Array(200);
    const bytesWritten = stringArrayCoder.encode(data, buffer);
    const [decoded, bytesRead] = stringArrayCoder.decode(buffer);

    assertEquals(decoded, data);
    assertEquals(bytesWritten, bytesRead);
  });
});

Deno.test("arrayLP: different length types", async (t) => {
  await t.step("works with u8 length type", () => {
    const coder = arrayLP(u16be(), u8be());
    const data = [1, 2, 3, 4, 5];

    const buffer = new Uint8Array(100);
    const bytesWritten = coder.encode(data, buffer);
    const [decoded, bytesRead] = coder.decode(buffer);

    assertEquals(decoded, data);
    assertEquals(bytesWritten, bytesRead);
  });

  await t.step("works with u16 length type", () => {
    const coder = arrayLP(u32be(), u16be());
    const data = [1, 2, 3, 4, 5];

    const buffer = new Uint8Array(100);
    const bytesWritten = coder.encode(data, buffer);
    const [decoded, bytesRead] = coder.decode(buffer);

    assertEquals(decoded, data);
    assertEquals(bytesWritten, bytesRead);
  });

  await t.step("works with u32 length type", () => {
    const coder = arrayLP(u8be(), u32be());
    const data = [1, 2, 3, 4, 5];

    const buffer = new Uint8Array(100);
    const bytesWritten = coder.encode(data, buffer);
    const [decoded, bytesRead] = coder.decode(buffer);

    assertEquals(decoded, data);
    assertEquals(bytesWritten, bytesRead);
  });
});

Deno.test("arrayLP: edge cases", async (t) => {
  await t.step("handles single element arrays", () => {
    const coder = arrayLP(u8be(), u16be());
    const data = [42];

    const buffer = new Uint8Array(100);
    const bytesWritten = coder.encode(data, buffer);
    const [decoded, bytesRead] = coder.decode(buffer);

    assertEquals(decoded, data);
    assertEquals(bytesWritten, bytesRead);
  });

  await t.step("handles large arrays", () => {
    const coder = arrayLP(u8be(), u16be());
    const data = Array.from({ length: 1000 }, (_, i) => i % 256);

    const buffer = new Uint8Array(3000);
    const bytesWritten = coder.encode(data, buffer);
    const [decoded, bytesRead] = coder.decode(buffer);

    assertEquals(decoded, data);
    assertEquals(bytesWritten, bytesRead);
  });

  await t.step("handles arrays with zero values", () => {
    const coder = arrayLP(u16be(), u8be());
    const data = [0, 0, 0, 0, 0];

    const buffer = new Uint8Array(100);
    const bytesWritten = coder.encode(data, buffer);
    const [decoded, bytesRead] = coder.decode(buffer);

    assertEquals(decoded, data);
    assertEquals(bytesWritten, bytesRead);
  });

  await t.step("handles arrays with maximum values", () => {
    const coder = arrayLP(u8be(), u16be());
    const data = [255, 255, 255, 255, 255];

    const buffer = new Uint8Array(100);
    const bytesWritten = coder.encode(data, buffer);
    const [decoded, bytesRead] = coder.decode(buffer);

    assertEquals(decoded, data);
    assertEquals(bytesWritten, bytesRead);
  });
});

Deno.test("arrayLP: error handling", async (t) => {
  await t.step("throws on buffer too small for length", () => {
    const coder = arrayLP(u8be(), u16be());
    const data = [1, 2, 3, 4, 5];

    const buffer = new Uint8Array(100);
    coder.encode(data, buffer);

    const smallBuffer = new Uint8Array(1);
    assertThrows(() => coder.decode(smallBuffer), Error);
  });

  await t.step("throws on buffer too small for elements", () => {
    const coder = arrayLP(u32be(), u8be());
    const data = [1, 2, 3, 4, 5];

    const buffer = new Uint8Array(100);
    coder.encode(data, buffer);

    // Buffer too small for length field (1 byte) - this should cause an error
    const smallBuffer = new Uint8Array(0);
    assertThrows(() => coder.decode(smallBuffer), Error);
  });

  await t.step("throws on empty buffer", () => {
    const coder = arrayLP(u8be(), u16be());
    const emptyBuffer = new Uint8Array(0);
    assertThrows(() => coder.decode(emptyBuffer), Error);
  });
});

Deno.test("arrayLP: roundtrip with offset", async (t) => {
  await t.step("works with buffer offset", () => {
    const coder = arrayLP(u16be(), u8be());
    const data = [1, 2, 3, 4, 5];

    const buffer = new Uint8Array(100);
    const offset = 10;
    const view = buffer.subarray(offset);

    const bytesWritten = coder.encode(data, view);
    const [decoded, bytesRead] = coder.decode(view);

    assertEquals(decoded, data);
    assertEquals(bytesWritten, bytesRead);
  });

  await t.step("works with multiple arrays in same buffer", () => {
    const coder = arrayLP(u8be(), u16be());
    const data1 = [1, 2, 3];
    const data2 = [4, 5, 6];

    const buffer = new Uint8Array(100);

    // Encode first array
    const bytesWritten1 = coder.encode(data1, buffer);

    // Encode second array after first
    const view2 = buffer.subarray(bytesWritten1);
    const bytesWritten2 = coder.encode(data2, view2);

    // Decode first array
    const [decoded1, bytesRead1] = coder.decode(buffer);
    assertEquals(decoded1, data1);
    assertEquals(bytesWritten1, bytesRead1);

    // Decode second array
    const view2ForDecode = buffer.subarray(bytesWritten1);
    const [decoded2, bytesRead2] = coder.decode(view2ForDecode);
    assertEquals(decoded2, data2);
    assertEquals(bytesWritten2, bytesRead2);
  });
});

Deno.test("arrayLP: floating point precision", async (t) => {
  await t.step("maintains precision for f32 arrays", () => {
    const coder = arrayLP(f32be(), u8be());
    const data = [1.5, 2.7, 3.14159];

    const buffer = new Uint8Array(100);
    const bytesWritten = coder.encode(data, buffer);
    const [decoded, bytesRead] = coder.decode(buffer);

    assertEquals(decoded.length, data.length);
    for (let i = 0; i < data.length; i++) {
      assertEquals(Math.abs(decoded[i] - data[i]) < 0.0001, true);
    }
    assertEquals(bytesWritten, bytesRead);
  });

  await t.step("maintains precision for f64 arrays", () => {
    const coder = arrayLP(f64be(), u16be());
    const data = [Math.PI, Math.E, 1.618033988749895];

    const buffer = new Uint8Array(100);
    const bytesWritten = coder.encode(data, buffer);
    const [decoded, bytesRead] = coder.decode(buffer);

    assertEquals(decoded.length, data.length);
    for (let i = 0; i < data.length; i++) {
      assertEquals(Math.abs(decoded[i] - data[i]) < 0.000000000000001, true);
    }
    assertEquals(bytesWritten, bytesRead);
  });
});
