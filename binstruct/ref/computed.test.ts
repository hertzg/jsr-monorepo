import { bytes } from "../bytes/bytes.ts";
import { assertEquals } from "@std/assert";
import { arrayFL } from "../array/fixed-length.ts";
import { u64, u8, u8be } from "../numeric/numeric.ts";
import { string } from "../string/string.ts";
import { struct } from "../struct/struct.ts";
import { computedRef, isRef, ref } from "./ref.ts";

Deno.test("computedRef: is a ref", () => {
  const width = u8be();
  const height = u8be();
  const computed = computedRef(
    [ref(width), ref(height)],
    (w, h) => w * h,
  );
  assertEquals(isRef(computed), true);
});

Deno.test("computedRef: computes values from multiple references", () => {
  const width = u8();
  const height = u8();

  const coder = struct({
    width: width,
    height: height,
    pixels: arrayFL(
      u8(),
      computedRef(
        [ref(width), ref(height)],
        (w, h) => w * h,
      ),
    ),
  });

  const data = {
    width: 2,
    height: 2,
    pixels: [255, 128, 64, 123],
  };
  const buffer = new Uint8Array(1000);
  const bytesWritten = coder.encode(data, buffer);
  const [decoded, bytesRead] = coder.decode(buffer);

  assertEquals(decoded.width, 2);
  assertEquals(decoded.height, 2);
  assertEquals(decoded.pixels.length, 4); // 2 * 2 = 4
  assertEquals(bytesWritten, bytesRead);
});

Deno.test("computedRef: works with different data types", () => {
  const n = u8();
  const b = u64();
  const s = string(); // null terminated string
  const y = bytes(4);

  const coder = struct({
    n,
    b,
    s,
    y,
    items: arrayFL(
      u8(),
      computedRef(
        [ref(n), ref(b), ref(s), ref(y)],
        (n, b, s, y) => n + Number(b) + s.length + y.length,
      ),
    ),
  });

  const data = {
    n: 1,
    b: 2n,
    s: "abc", // 3
    y: new Uint8Array([1, 2, 3, 4]),
    items: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  };
  const buffer = new Uint8Array(100).fill(0xff);
  const bytesWritten = coder.encode(data, buffer);
  const [decoded, bytesRead] = coder.decode(buffer);

  assertEquals(decoded.n, 1);
  assertEquals(decoded.b, 2n);
  assertEquals(decoded.s, "abc");
  assertEquals(decoded.y.length, 4);
  assertEquals(decoded.items.length, 10);
  assertEquals(bytesWritten, bytesRead);
});
