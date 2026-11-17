import { test } from "node:test";
import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { autoDns } from "./auto-dns.ts";

test("autoDns decodes the element the firmware writes", () => {
  const root = parse('<AutoDns version="1.1"><enable>1</enable></AutoDns>')
    .root;

  assertEquals(autoDns.decode(root), { enable: 1 });
});

test("autoDns round-trips through encode and decode", () => {
  const value = { enable: 0 };

  assertEquals(autoDns.decode(parse(autoDns.encode(value)).root), value);
});

test("autoDns throws without enable, as the firmware parser does", () => {
  const root = parse('<AutoDns version="1.1"></AutoDns>').root;

  assertThrows(() => autoDns.decode(root), Error, "<enable>");
});
