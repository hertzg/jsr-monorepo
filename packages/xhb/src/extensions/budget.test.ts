import { assertEquals } from "@std/assert";
import { budgetExtension, parseBudget, serializeBudget } from "./budget.ts";

Deno.test("parseBudget - parses budget attributes into array", () => {
  const budget = parseBudget({ b0: "100", b3: "250.50", b12: "50" });

  assertEquals(budget.length, 13);
  assertEquals(budget[0], 100);
  assertEquals(budget[1], 0);
  assertEquals(budget[2], 0);
  assertEquals(budget[3], 250.5);
  assertEquals(budget[12], 50);
});

Deno.test("parseBudget - returns all zeros when no budget attributes", () => {
  const budget = parseBudget({ key: "1", name: "test" });

  assertEquals(budget.length, 13);
  for (let i = 0; i < 13; i++) {
    assertEquals(budget[i], 0);
  }
});

Deno.test("parseBudget - parses all 13 budget slots", () => {
  const attrs: Record<string, string> = {};
  for (let i = 0; i <= 12; i++) {
    attrs[`b${i}`] = String((i + 1) * 10);
  }

  const budget = parseBudget(attrs);
  assertEquals(budget.length, 13);
  for (let i = 0; i <= 12; i++) {
    assertEquals(budget[i], (i + 1) * 10);
  }
});

Deno.test("parseBudget - handles negative amounts", () => {
  const budget = parseBudget({ b1: "-100.5", b5: "-250" });

  assertEquals(budget[1], -100.5);
  assertEquals(budget[5], -250);
});

Deno.test("serializeBudget - serializes non-zero budget entries", () => {
  const budget = [0, 100, 0, 250.5, 0, 0, 0, 0, 0, 0, 0, 0, 50];
  const attrs = serializeBudget(budget);

  assertEquals(attrs, [
    'b1="100"',
    'b3="250.5"',
    'b12="50"',
  ]);
});

Deno.test("serializeBudget - returns empty array for all-zero budget", () => {
  const budget = new Array(13).fill(0);
  assertEquals(serializeBudget(budget), []);
});

Deno.test("serializeBudget - returns empty array for empty budget", () => {
  assertEquals(serializeBudget([]), []);
});

Deno.test("serializeBudget - returns empty for undefined-like input", () => {
  assertEquals(serializeBudget(undefined as unknown as number[]), []);
  assertEquals(serializeBudget(null as unknown as number[]), []);
});

Deno.test("serializeBudget - handles negative values", () => {
  const budget = [0, -100.5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  const attrs = serializeBudget(budget);
  assertEquals(attrs, ['b1="-100.5"']);
});

Deno.test("budgetExtension - round-trip parse and serialize", () => {
  const ext = budgetExtension();
  const entity: Record<string, unknown> = {};

  ext.parse({ b0: "100", b6: "200" }, entity);

  const budget = entity["budget"] as number[];
  assertEquals(budget[0], 100);
  assertEquals(budget[6], 200);
  assertEquals(budget[1], 0);

  const attrs = ext.serialize(entity);
  assertEquals(attrs, ['b0="100"', 'b6="200"']);
});

Deno.test("budgetExtension - parse with no budget attrs sets all zeros", () => {
  const ext = budgetExtension();
  const entity: Record<string, unknown> = {};

  ext.parse({ key: "1" }, entity);

  const budget = entity["budget"] as number[];
  assertEquals(budget.length, 13);
  for (const val of budget) {
    assertEquals(val, 0);
  }
});

Deno.test("budgetExtension - serialize with no budget field returns empty", () => {
  const ext = budgetExtension();
  assertEquals(ext.serialize({}), []);
  assertEquals(ext.serialize({ budget: "not an array" }), []);
});
