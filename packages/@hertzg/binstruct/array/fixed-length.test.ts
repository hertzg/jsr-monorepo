import { assertEquals, assertThrows } from "@std/assert";
import { kCoderKind } from "../core.ts";
import { u16, u8 } from "../numeric/numeric.ts";
import { ref } from "../ref/ref.ts";
import { kKindArrayFL } from "./fixed-length.ts";
import { arrayFL } from "./fixed-length.ts";

Deno.test("arrayFL creates fixed-length array coder", () => {
  const coder = arrayFL(u8(), 5);
  assertEquals(coder[kCoderKind], kKindArrayFL);
});

Deno.test("arrayFL with ref creates fixed-length array coder", () => {
  const coder = arrayFL(u16(), ref(u8()));
  assertEquals(coder[kCoderKind], kKindArrayFL);
});

Deno.test("arrayFL validates array length during encode", () => {
  const coder = arrayFL(u8(), 3);
  const data = [1, 2, 3, 4]; // Wrong length

  assertThrows(
    () => {
      const buffer = new Uint8Array(100);
      coder.encode(data, buffer);
    },
    Error,
    "Invalid length: 3. Must be equal to the decoded length.",
  );
});

Deno.test("arrayFL accepts correct array length during encode", () => {
  const coder = arrayFL(u8(), 3);
  const data = [1, 2, 3]; // Correct length

  const buffer = new Uint8Array(100);
  const bytesWritten = coder.encode(data, buffer);
  assertEquals(bytesWritten, 3);
});

Deno.test("arrayFL handles empty arrays", () => {
  const coder = arrayFL(u8(), 0);
  const data: number[] = [];

  const buffer = new Uint8Array(100);
  const bytesWritten = coder.encode(data, buffer);
  assertEquals(bytesWritten, 0);
});
