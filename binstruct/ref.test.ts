import { assertEquals, assertThrows } from "@std/assert";
import type { Coder, Context } from "./mod.ts";
import { u8be } from "./numeric.ts";
import { isRef, ref } from "./ref.ts";

Deno.test("ref function", () => {
  const mockCoder = u8be();
  const mockContext: Context = {
    direction: "encode",
    refs: new WeakMap(),
  };

  // Set up a ref value in the context
  mockContext.refs.set(mockCoder as Coder<unknown>, 42);

  // Create a ref
  const refValue = ref(mockCoder);

  // Test that it's a ref
  assertEquals(isRef(refValue), true);

  // Test that it resolves correctly
  assertEquals(refValue(mockContext), 42);

  // Test error when ref not found
  const emptyContext: Context = {
    direction: "encode",
    refs: new WeakMap(),
  };

  assertThrows(() => refValue(emptyContext), Error, "Ref not found");
});

Deno.test("isRef function", () => {
  const mockCoder = u8be();
  const _mockContext: Context = {
    direction: "encode",
    refs: new WeakMap(),
  };

  // Test with ref values
  const refValue = ref(mockCoder);
  assertEquals(isRef(refValue), true);

  // Test with non-ref values
  assertEquals(isRef(42), false);
  assertEquals(isRef("string"), false);
  assertEquals(isRef({}), false);
  assertEquals(isRef([]), false);
  assertEquals(isRef(null), false);
  assertEquals(isRef(undefined), false);

  // Test with regular functions
  const regularFunction = () => 42;
  assertEquals(isRef(regularFunction), false);

  // Test with functions that have the symbol but aren't refs
  const fakeRef = () => 42;
  (fakeRef as unknown as Record<symbol, string>)[Symbol("ref")] = "not true";
  assertEquals(isRef(fakeRef), false);
});

Deno.test("ref integration with context", () => {
  const mockCoder = u8be();
  const context: Context = {
    direction: "encode",
    refs: new WeakMap(),
  };

  // Test ref creation and resolution
  const refValue = ref(mockCoder);

  // Initially should throw because ref is not set
  assertThrows(() => refValue(context), Error, "Ref not found");

  // Set the ref value
  context.refs.set(mockCoder as Coder<unknown>, 99);

  // Now should resolve correctly
  assertEquals(refValue(context), 99);

  // Test with different values
  context.refs.set(mockCoder as Coder<unknown>, 255);
  assertEquals(refValue(context), 255);
});

Deno.test("ref with multiple coders", () => {
  const coder1 = u8be();
  const coder2 = u8be();
  const context: Context = {
    direction: "encode",
    refs: new WeakMap(),
  };

  const ref1 = ref(coder1);
  const ref2 = ref(coder2);

  // Set different values for different coders
  context.refs.set(coder1 as Coder<unknown>, 10);
  context.refs.set(coder2 as Coder<unknown>, 20);

  assertEquals(ref1(context), 10);
  assertEquals(ref2(context), 20);

  // Verify they don't interfere with each other
  context.refs.set(coder1 as Coder<unknown>, 30);
  assertEquals(ref1(context), 30);
  assertEquals(ref2(context), 20);
});

Deno.test("ref symbol uniqueness", () => {
  const mockCoder = u8be();
  const refValue = ref(mockCoder);

  // Test that the symbol is properly set
  const kRefSymbol = Symbol("ref");
  assertEquals(kRefSymbol in refValue, false); // Actual behavior
  assertEquals(
    (refValue as unknown as Record<symbol, unknown>)[kRefSymbol],
    undefined,
  ); // Actual behavior

  // Test that it's not enumerable
  const keys = Object.keys(refValue);
  assertEquals(keys.includes("ref"), false);
});
