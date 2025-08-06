import { assertEquals, assertThrows } from "@std/assert";
import type { Coder, Context } from "./mod.ts";
import { u8be } from "./numeric.ts";
import { isValidLength, tryUnrefLength } from "./length.ts";
import { ref } from "./ref.ts";

Deno.test("isValidLength", () => {
  // Valid lengths
  assertEquals(isValidLength(0), true);
  assertEquals(isValidLength(1), true);
  assertEquals(isValidLength(100), true);
  assertEquals(isValidLength(Number.MAX_SAFE_INTEGER), true);

  // Invalid lengths
  assertEquals(isValidLength(-1), false);
  assertEquals(isValidLength(-100), false);
  assertEquals(isValidLength(1.5), false);
  assertEquals(isValidLength(3.14), false);
  assertEquals(isValidLength(NaN), false);
  assertEquals(isValidLength(Infinity), false);
  assertEquals(isValidLength(-Infinity), false);
});

Deno.test("tryUnrefLength", () => {
  const mockContext: Context = {
    direction: "encode",
    refs: new WeakMap(),
  };

  // Test with null/undefined values
  assertEquals(tryUnrefLength(null, null), null);
  assertEquals(tryUnrefLength(undefined, undefined), undefined);
  assertEquals(tryUnrefLength(5, null), 5);
  assertEquals(tryUnrefLength(10, undefined), 10);

  // Test with numeric values
  assertEquals(tryUnrefLength(0, mockContext), 0);
  assertEquals(tryUnrefLength(42, mockContext), 42);
  assertEquals(tryUnrefLength(1000, mockContext), 1000);

  // Test with ref values
  const mockCoder = u8be();
  const mockRef = ref(mockCoder);
  mockContext.refs.set(mockCoder as Coder<unknown>, 123);

  assertEquals(tryUnrefLength(mockRef, mockContext), 123);
});

Deno.test("tryUnrefLength with refs", () => {
  const mockCoder = u8be();
  const context: Context = {
    direction: "encode",
    refs: new WeakMap(),
  };

  // Test with numeric length
  assertEquals(tryUnrefLength(42, context), 42);

  // Test with ref length
  const refLength = ref(mockCoder);
  context.refs.set(mockCoder as Coder<unknown>, 100);
  assertEquals(tryUnrefLength(refLength, context), 100); // Actual behavior

  // Test with ref that doesn't exist in context - should throw
  const anotherCoder = u8be();
  const anotherRef = ref(anotherCoder);
  assertThrows(
    () => tryUnrefLength(anotherRef, context),
    Error,
    "Ref not found",
  );
});
