import { test } from "node:test";
import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { cloudBindInfo } from "./cloud-bind-info.ts";

test("cloudBindInfo decodes the reply the cmd 268 handler writes", () => {
  const root = parse(
    '<CloudBindInfo version="1.1"><binded>0</binded></CloudBindInfo>',
  ).root;

  assertEquals(cloudBindInfo.decode(root), { binded: 0 });
});

test("cloudBindInfo round-trips a full value", () => {
  const value = { binded: 1 };

  assertEquals(
    cloudBindInfo.decode(parse(cloudBindInfo.encode(value)).root),
    value,
  );
});

test("cloudBindInfo rejects a reply without binded", () => {
  const root = parse('<CloudBindInfo version="1.1"></CloudBindInfo>').root;

  assertThrows(() => cloudBindInfo.decode(root), Error, "binded");
});
