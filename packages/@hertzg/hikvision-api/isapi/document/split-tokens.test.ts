import { assertEquals } from "@std/assert";
import { test } from "node:test";
import { splitTokens } from "./split-tokens.ts";

test("splitTokens trims items and drops empty ones", () => {
  assertEquals(splitTokens(" grid , region,,"), ["grid", "region"]);
});

test("splitTokens returns no items for an empty string", () => {
  assertEquals(splitTokens(""), []);
});
