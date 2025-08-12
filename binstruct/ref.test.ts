import { assertEquals } from "@std/assert";
import { computedRef, ref } from "./ref.ts";
import { struct } from "./struct.ts";
import { u16be, u8be } from "./numeric.ts";
import { arrayFL } from "./array.ts";

Deno.test("computedRef: basic functionality", async (t) => {
  await t.step("computes values from multiple references", () => {
    // Create the coders that will be referenced
    const width = u16be();
    const height = u16be();

    // Define a structure with computed array length
    const coder = struct({
      width: width,
      height: height,
      pixels: arrayFL(
        u8be(),
        computedRef(
          (w: number, h: number) => w * h,
          [ref(width), ref(height)],
        ),
      ),
    });

    // Create sample data
    const data = {
      width: 3,
      height: 2,
      pixels: [255, 128, 64, 0, 255, 128],
    };

    // Encode the data with context
    const buffer = new Uint8Array(1000);
    const bytesWritten = coder.encode(data, buffer);

    // Decode the data with context
    const [decoded, bytesRead] = coder.decode(buffer);

    // Verify the data matches
    assertEquals(decoded.width, data.width);
    assertEquals(decoded.height, data.height);
    assertEquals(decoded.pixels, data.pixels);
    assertEquals(bytesWritten, bytesRead);
  });

  await t.step("works with color struct example", () => {
    const color = struct({
      r: u8be(),
      g: u8be(),
      b: u8be(),
      a: u8be(),
    });

    const width = u16be();
    const height = u16be();

    const coder = struct({
      width: width,
      height: height,
      pixels: arrayFL(
        color,
        computedRef(
          (w: number, h: number) => w * h,
          [ref(width), ref(height)],
        ),
      ),
    });

    // Create sample data
    const data = {
      width: 2,
      height: 2,
      pixels: [
        { r: 255, g: 0, b: 0, a: 255 },
        { r: 0, g: 255, b: 0, a: 255 },
        { r: 0, g: 0, b: 255, a: 255 },
        { r: 255, g: 255, b: 255, a: 255 },
      ],
    };

    // Encode the data with context
    const buffer = new Uint8Array(1000);
    const bytesWritten = coder.encode(data, buffer);

    // Decode the data with context
    const [decoded, bytesRead] = coder.decode(buffer);

    // Verify the data matches
    assertEquals(decoded.width, data.width);
    assertEquals(decoded.height, data.height);
    assertEquals(decoded.pixels.length, data.pixels.length);
    for (let i = 0; i < data.pixels.length; i++) {
      assertEquals(decoded.pixels[i].r, data.pixels[i].r);
      assertEquals(decoded.pixels[i].g, data.pixels[i].g);
      assertEquals(decoded.pixels[i].b, data.pixels[i].b);
      assertEquals(decoded.pixels[i].a, data.pixels[i].a);
    }
    assertEquals(bytesWritten, bytesRead);
  });

  await t.step("works with different computation functions", () => {
    const count = u16be();
    const multiplier = u8be();

    const coder = struct({
      count: count,
      multiplier: multiplier,
      items: arrayFL(
        u8be(),
        computedRef(
          (c: number, m: number) => c * m,
          [ref(count), ref(multiplier)],
        ),
      ),
    });

    const data = {
      count: 3,
      multiplier: 2,
      items: [1, 2, 3, 4, 5, 6],
    };

    const buffer = new Uint8Array(1000);
    const bytesWritten = coder.encode(data, buffer);
    const [decoded, bytesRead] = coder.decode(buffer);

    assertEquals(decoded.count, data.count);
    assertEquals(decoded.multiplier, data.multiplier);
    assertEquals(decoded.items, data.items);
    assertEquals(bytesWritten, bytesRead);
  });
});
