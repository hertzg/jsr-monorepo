import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { agingTest } from "./aging-test.ts";

Deno.test("agingTest decodes every field the parser reads", () => {
  const root = parse(
    '<AgingTest version="1.1"><channelId>1</channelId><enable>1</enable>' +
      "<fileName>aging-run.bin</fileName><size>8192</size></AgingTest>",
  ).root;

  assertEquals(agingTest.decode(root), {
    channelId: 1,
    enable: 1,
    fileName: "aging-run.bin",
    size: 8192,
  });
});

Deno.test("agingTest decodes an element with only some fields", () => {
  const root = parse('<AgingTest version="1.1"><enable>0</enable></AgingTest>')
    .root;

  assertEquals(agingTest.decode(root), { enable: 0 });
});

Deno.test("agingTest round-trips through encode and decode", () => {
  const value = {
    channelId: 2,
    enable: 1,
    fileName: "burn-in.log",
    size: 1024,
  };

  const xml = agingTest.encode(value);

  assertEquals(agingTest.decode(parse(xml).root), value);
});
