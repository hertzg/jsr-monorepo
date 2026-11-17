import { test } from "node:test";
import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { smtPlayUrl } from "./smt-play-url.ts";

test("smtPlayUrl decodes a request for a channel and stream", () => {
  const root = parse(
    '<SmtPlayUrl version="1.1"><channelId>3</channelId>' +
      "<stream_type>1</stream_type></SmtPlayUrl>",
  ).root;

  assertEquals(smtPlayUrl.decode(root), { channelId: 3, stream_type: 1 });
});

test("smtPlayUrl round-trips through encode and decode", () => {
  const value = { channelId: 7, stream_type: 2 };

  const xml = smtPlayUrl.encode(value);

  assertEquals(smtPlayUrl.decode(parse(xml).root), value);
});

test("smtPlayUrl decodes a request without a stream type", () => {
  const root = parse(
    '<SmtPlayUrl version="1.1"><channelId>5</channelId></SmtPlayUrl>',
  ).root;

  assertEquals(smtPlayUrl.decode(root), { channelId: 5 });
});
