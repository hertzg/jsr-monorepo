import { test } from "node:test";
import { assertEquals } from "@std/assert";
import { parseBoundary } from "./parse-boundary.ts";

test("parseBoundary reads a bare, quoted, or dash-prefixed boundary", () => {
  assertEquals(parseBoundary("multipart/mixed;boundary=boundary"), "boundary");
  assertEquals(
    parseBoundary('multipart/mixed; boundary="frontier"'),
    "frontier",
  );
  assertEquals(
    parseBoundary("multipart/mixed; boundary=--boundary"),
    "boundary",
  );
  assertEquals(parseBoundary("application/xml; charset=UTF-8"), undefined);
  assertEquals(parseBoundary(null), undefined);
});
