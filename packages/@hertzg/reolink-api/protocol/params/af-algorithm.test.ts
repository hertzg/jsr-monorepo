import { test } from "node:test";
import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { afAlgorithm } from "./af-algorithm.ts";

test("afAlgorithm decodes the reply the camera writes", () => {
  const root = parse(
    '<afAlgorithm version="1.1"><channelId>3</channelId>' +
      "<algorithm>2</algorithm></afAlgorithm>",
  ).root;

  assertEquals(afAlgorithm.decode(root), { channelId: 3, algorithm: 2 });
});

test("afAlgorithm round-trips through encode and decode", () => {
  const value = { channelId: 1, algorithm: 5 };

  const xml = afAlgorithm.encode(value);

  assertEquals(afAlgorithm.decode(parse(xml).root), value);
});

test("afAlgorithm decodes a request without a channel", () => {
  const root = parse(
    '<afAlgorithm version="1.1"><algorithm>4</algorithm></afAlgorithm>',
  ).root;

  assertEquals(afAlgorithm.decode(root), { algorithm: 4 });
});
