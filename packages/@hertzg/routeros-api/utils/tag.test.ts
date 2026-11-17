import { test } from "node:test";
import { assertEquals } from "@std/assert";
import { getTag, hasTag, hasTagValue, withoutTag, withTag } from "./tag.ts";

test("getTag - extracts tag from sentence", () => {
  const words = ["/interface/print", ".tag=req-1"];
  assertEquals(getTag(words), "req-1");
});

test("getTag - returns undefined if no tag", () => {
  const words = ["/interface/print", "=name=ether1"];
  assertEquals(getTag(words), undefined);
});

test("getTag - handles multiple words", () => {
  const words = [
    "/interface/set",
    "=.id=*1",
    "=name=ether1",
    ".tag=my-tag",
    "=disabled=false",
  ];
  assertEquals(getTag(words), "my-tag");
});

test("getTag - empty sentence", () => {
  assertEquals(getTag([]), undefined);
});

test("withTag - adds tag to sentence", () => {
  const words = ["/interface/print"];
  const result = withTag(words, "req-1");
  assertEquals(result, ["/interface/print", ".tag=req-1"]);
});

test("withTag - replaces existing tag", () => {
  const words = ["/interface/print", ".tag=old-tag"];
  const result = withTag(words, "new-tag");
  assertEquals(result, ["/interface/print", ".tag=new-tag"]);
});

test("withTag - preserves other words", () => {
  const words = ["/interface/set", "=.id=*1", "=name=ether1"];
  const result = withTag(words, "req-99");
  assertEquals(result, [
    "/interface/set",
    "=.id=*1",
    "=name=ether1",
    ".tag=req-99",
  ]);
});

test("withTag - does not mutate original", () => {
  const words = ["/interface/print"];
  const result = withTag(words, "req-1");
  assertEquals(words, ["/interface/print"]); // Original unchanged
  assertEquals(result, ["/interface/print", ".tag=req-1"]);
});

test("withoutTag - removes tag from sentence", () => {
  const words = ["/interface/print", ".tag=req-1"];
  const result = withoutTag(words);
  assertEquals(result, ["/interface/print"]);
});

test("withoutTag - handles sentence without tag", () => {
  const words = ["/interface/print", "=name=ether1"];
  const result = withoutTag(words);
  assertEquals(result, ["/interface/print", "=name=ether1"]);
});

test("withoutTag - preserves other words", () => {
  const words = [
    "/interface/set",
    "=.id=*1",
    ".tag=req-1",
    "=name=ether1",
  ];
  const result = withoutTag(words);
  assertEquals(result, ["/interface/set", "=.id=*1", "=name=ether1"]);
});

test("withoutTag - does not mutate original", () => {
  const words = ["/interface/print", ".tag=req-1"];
  const result = withoutTag(words);
  assertEquals(words, ["/interface/print", ".tag=req-1"]); // Original unchanged
  assertEquals(result, ["/interface/print"]);
});

test("hasTag - detects tag presence", () => {
  assertEquals(hasTag(["/interface/print", ".tag=req-1"]), true);
  assertEquals(hasTag(["/interface/print"]), false);
  assertEquals(hasTag([]), false);
});

test("hasTagValue - checks specific tag value", () => {
  const words = ["/interface/print", ".tag=req-1"];
  assertEquals(hasTagValue(words, "req-1"), true);
  assertEquals(hasTagValue(words, "req-2"), false);
  assertEquals(hasTagValue(words, ""), false);
});

test("hasTagValue - handles no tag", () => {
  const words = ["/interface/print"];
  assertEquals(hasTagValue(words, "req-1"), false);
});

test("tag roundtrip - add and extract", () => {
  const original = ["/interface/print", "=name=ether1"];
  const tagged = withTag(original, "test-123");
  const extractedTag = getTag(tagged);
  const untagged = withoutTag(tagged);

  assertEquals(extractedTag, "test-123");
  assertEquals(untagged, original);
});

test("tag edge cases", () => {
  // Tag with special characters
  const words1 = withTag(["/test"], "tag-with-dashes");
  assertEquals(getTag(words1), "tag-with-dashes");

  // Numeric tag
  const words2 = withTag(["/test"], "12345");
  assertEquals(getTag(words2), "12345");

  // Empty tag value
  const words3 = withTag(["/test"], "");
  assertEquals(getTag(words3), "");
  assertEquals(hasTagValue(words3, ""), true);
});
