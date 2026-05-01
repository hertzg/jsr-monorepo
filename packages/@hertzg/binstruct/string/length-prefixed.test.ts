import { assertEquals } from "@std/assert";
import { u16, u32, u8 } from "../numeric/numeric.ts";
import { stringLP } from "./length-prefixed.ts";

Deno.test("string - length prefixed - u8", () => {
  const coder = stringLP(u8());
  const testString = "Hello, World!";
  const buffer = new Uint8Array(100);

  const bytesWritten = coder.encode(testString, buffer);
  const [decoded, bytesRead] = coder.decode(buffer);

  assertEquals(decoded, testString);
  assertEquals(bytesWritten, bytesRead);
  assertEquals(bytesWritten, testString.length + 1); // 1 for length
});

Deno.test("string - length prefixed - u16", () => {
  const coder = stringLP(u16());
  const testString = "Hello, World!";
  const buffer = new Uint8Array(100);

  const bytesWritten = coder.encode(testString, buffer);
  const [decoded, bytesRead] = coder.decode(buffer);

  assertEquals(decoded, testString);
  assertEquals(bytesWritten, bytesRead);
  assertEquals(bytesWritten, testString.length + 2); // 2 for length
});

Deno.test("string - length prefixed - u32", () => {
  const coder = stringLP(u32());
  const testString = "Hello, World!";
  const buffer = new Uint8Array(100);

  const bytesWritten = coder.encode(testString, buffer);
  const [decoded, bytesRead] = coder.decode(buffer);

  assertEquals(decoded, testString);
  assertEquals(bytesWritten, bytesRead);
  assertEquals(bytesWritten, testString.length + 4); // 4 for length
});
