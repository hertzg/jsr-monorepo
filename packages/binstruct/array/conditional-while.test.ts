import { assertEquals } from "@std/assert";
import { kCoderKind } from "../core.ts";
import { u8 } from "../numeric/numeric.ts";
import { arrayWhile, kKindArrayWhile } from "./conditional-while.ts";

Deno.test("arrayWhile creates conditional array coder", () => {
  const coder = arrayWhile(u8(), ({ index }) => index < 3);
  assertEquals(coder[kCoderKind], kKindArrayWhile);
});

Deno.test("arrayWhile with index-based condition", () => {
  const coder = arrayWhile(u8(), ({ index }) => index < 2);
  const data = [1, 2, 3, 4, 5];

  const buffer = new Uint8Array(100);
  const bytesWritten = coder.encode(data, buffer);
  assertEquals(bytesWritten, 2); // Only first 2 elements
});

Deno.test("arrayWhile with array length condition", () => {
  const coder = arrayWhile(u8(), ({ array }) => array.length < 4);
  const data = [1, 2, 3];

  const buffer = new Uint8Array(100);
  const bytesWritten = coder.encode(data, buffer);
  assertEquals(bytesWritten, 3); // All elements since length < 4
});

Deno.test("arrayWhile with buffer-based condition", () => {
  const coder = arrayWhile(u8(), ({ buffer }) => buffer.length >= 2);
  const data = [1, 2, 3, 4, 5];

  const buffer = new Uint8Array(3); // Small buffer
  const bytesWritten = coder.encode(data, buffer);
  assertEquals(bytesWritten, 2); // Only 2 elements fit: first uses 1 byte (buffer.length=2), second uses 1 byte (buffer.length=1), then buffer.length < 2 so stops
});

Deno.test("arrayWhile with complex condition", () => {
  const coder = arrayWhile(
    u8(),
    ({ index, array, buffer }) =>
      index < 3 && buffer.length >= 2 && array[index] < 10,
  );
  const data = [1, 2, 3, 4, 5];

  const buffer = new Uint8Array(10);
  const bytesWritten = coder.encode(data, buffer);
  assertEquals(bytesWritten, 3); // First 3 elements meet all conditions
});
