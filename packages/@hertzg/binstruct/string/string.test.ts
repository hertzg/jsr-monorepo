import { assertEquals } from "@std/assert";
import { kCoderKind } from "../core.ts";
import { u16 } from "../numeric/numeric.ts";
import { ref } from "../ref/ref.ts";
import { kKindStringFL } from "./fixed-length.ts";
import { kKindStringLP } from "./length-prefixed.ts";
import { kKindStringNT } from "./null-terminated.ts";
import { string } from "./string.ts";

Deno.test("string() with no arguments creates null-terminated coder", () => {
  const coder = string();
  assertEquals(coder[kCoderKind], kKindStringNT);
});

Deno.test("string(coder) creates length-prefixed coder", () => {
  const coder = string(u16());
  assertEquals(coder[kCoderKind], kKindStringLP);
});

Deno.test("string(number) creates fixed-length coder", () => {
  const coder = string(10);
  assertEquals(coder[kCoderKind], kKindStringFL);
});

Deno.test("string(coder) creates length-prefixed coder", () => {
  const coder = string(u16());
  assertEquals(coder[kCoderKind], kKindStringLP);
});

Deno.test("string(ref) creates fixed-length coder with reference", () => {
  const coder = string(ref(u16()));
  assertEquals(coder[kCoderKind], kKindStringFL);
});
