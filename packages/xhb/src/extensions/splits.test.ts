import { assertEquals } from "@std/assert";
import { parseSplits, serializeSplits, splitsExtension } from "./splits.ts";

Deno.test("parseSplits - parses split attributes into array", () => {
  const splits = parseSplits({
    scat: "1||2||3",
    samt: "10.5||20.3||30.0",
    smem: "groceries||rent||utilities",
  });

  assertEquals(splits, [
    { cat: 1, amt: 10.5, mem: "groceries" },
    { cat: 2, amt: 20.3, mem: "rent" },
    { cat: 3, amt: 30.0, mem: "utilities" },
  ]);
});

Deno.test("parseSplits - returns empty array when no split attributes", () => {
  const splits = parseSplits({ key: "1", amount: "100" });
  assertEquals(splits, []);
});

Deno.test("parseSplits - handles single split entry", () => {
  const splits = parseSplits({
    scat: "5",
    samt: "42.0",
    smem: "single item",
  });

  assertEquals(splits, [{ cat: 5, amt: 42.0, mem: "single item" }]);
});

Deno.test("parseSplits - handles missing memo attribute", () => {
  const splits = parseSplits({
    scat: "1||2",
    samt: "10||20",
  });

  assertEquals(splits.length, 2);
  assertEquals(splits[0].cat, 1);
  assertEquals(splits[0].amt, 10);
});

Deno.test("parseSplits - handles empty memos", () => {
  const splits = parseSplits({
    scat: "1||2",
    samt: "10||20",
    smem: "||",
  });

  assertEquals(splits, [
    { cat: 1, amt: 10, mem: "" },
    { cat: 2, amt: 20, mem: "" },
  ]);
});

Deno.test("serializeSplits - serializes split array to attribute strings", () => {
  const attrs = serializeSplits([
    { cat: 1, amt: 10.5, mem: "groceries" },
    { cat: 2, amt: 20.3, mem: "rent" },
  ]);

  assertEquals(attrs, [
    'scat="1||2"',
    'samt="10.5||20.3"',
    'smem="groceries||rent"',
  ]);
});

Deno.test("serializeSplits - returns empty array for empty splits", () => {
  assertEquals(serializeSplits([]), []);
});

Deno.test("serializeSplits - returns empty array for undefined-like input", () => {
  assertEquals(serializeSplits(undefined as unknown as never[]), []);
  assertEquals(serializeSplits(null as unknown as never[]), []);
});

Deno.test("serializeSplits - handles single split", () => {
  const attrs = serializeSplits([{ cat: 5, amt: 42.0, mem: "item" }]);

  assertEquals(attrs, [
    'scat="5"',
    'samt="42"',
    'smem="item"',
  ]);
});

Deno.test("splitsExtension - round-trip parse and serialize", () => {
  const ext = splitsExtension();
  const entity: Record<string, unknown> = {};

  ext.parse(
    { scat: "5||10", samt: "1.5||2.5", smem: "a||b" },
    entity,
  );

  assertEquals(entity["splits"], [
    { cat: 5, amt: 1.5, mem: "a" },
    { cat: 10, amt: 2.5, mem: "b" },
  ]);

  const attrs = ext.serialize(entity);
  assertEquals(attrs, [
    'scat="5||10"',
    'samt="1.5||2.5"',
    'smem="a||b"',
  ]);
});

Deno.test("splitsExtension - parse with no split attrs sets empty array", () => {
  const ext = splitsExtension();
  const entity: Record<string, unknown> = {};

  ext.parse({ key: "1" }, entity);
  assertEquals(entity["splits"], []);
});

Deno.test("splitsExtension - serialize with no splits field returns empty", () => {
  const ext = splitsExtension();
  assertEquals(ext.serialize({}), []);
  assertEquals(ext.serialize({ splits: "not an array" }), []);
});
