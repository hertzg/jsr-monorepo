import { assertEquals, assertThrows } from "@std/assert";
import { isValidLength, lengthRefGet } from "./length.ts";
import { type Context, createContext } from "./core.ts";
import { u8be } from "./numeric/numeric.ts";
import { ref, refSetValue } from "./ref/ref.ts";

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

Deno.test("lengthRefGetSet", async (t) => {
  await t.step("without context", () => {
    const lengthCoder = u8be();
    const lengthRef = ref(lengthCoder);
    assertEquals(lengthRefGet(null, 5), 5);
    assertEquals(lengthRefGet(undefined, 10), 10);
    assertEquals(lengthRefGet(null, lengthRef), undefined);
    assertEquals(lengthRefGet(undefined, lengthRef), undefined);
  });

  await t.step("with context", () => {
    const context = createContext("encode");
    const lengthCoder = u8be();
    const lengthRef = ref(lengthCoder);
    assertEquals(lengthRefGet(context, 42), 42);
    assertEquals(lengthRefGet(context, 1000), 1000);

    // A bare object stands in for a context built without ref storage.
    assertEquals(lengthRefGet({} as Context, lengthRef), undefined);
    assertThrows(
      () => lengthRefGet(context, lengthRef),
      Error,
      "Ref not found",
    );

    refSetValue(context, lengthCoder, 123);
    assertEquals(lengthRefGet(context, lengthRef), 123);
  });
});
