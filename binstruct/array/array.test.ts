import { assertEquals } from "@std/assert";
import { kCoderKind } from "../core.ts";
import { u16 } from "../numeric/numeric.ts";
import { ref } from "../ref/ref.ts";
import { kKindArrayFL } from "./fixed-length.ts";
import { kKindArrayLP } from "./length-prefixed.ts";
import { array } from "./array.ts";
import { kKindArrayWhile } from "./conditional-while.ts";

Deno.test("array(coder) creates length-prefixed array", () => {
  const coder = array(u16(), u16());
  assertEquals(coder[kCoderKind], kKindArrayLP);
});

Deno.test("array(number) creates fixed-length array", () => {
  const coder = array(u16(), 10);
  assertEquals(coder[kCoderKind], kKindArrayFL);
});

Deno.test("array(ref) creates fixed-length array with reference", () => {
  const coder = array(u16(), ref(u16()));
  assertEquals(coder[kCoderKind], kKindArrayFL);
});

Deno.test("array(condition) creates conditional array", () => {
  const coder = array(u16(), ({ index }) => index < 3);
  assertEquals(coder[kCoderKind], kKindArrayWhile);
});
