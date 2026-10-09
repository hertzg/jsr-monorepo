import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { smtPlayUrlReply } from "./smt-play-url-reply.ts";

Deno.test("smtPlayUrlReply decodes the cmd 346 reply", () => {
  const root = parse(
    '<SmtPlayURL version="1.1"><url>rtsp://192.168.1.10:554/h264Preview_01_main</url></SmtPlayURL>',
  ).root;

  assertEquals(smtPlayUrlReply.decode(root), {
    url: "rtsp://192.168.1.10:554/h264Preview_01_main",
  });
});

Deno.test("smtPlayUrlReply round-trips a URL with a query string", () => {
  const value = {
    url: "http://10.0.0.5/flv?port=1935&app=bcs&stream=channel0_main.bcs",
  };

  const xml = smtPlayUrlReply.encode(value);

  assertEquals(smtPlayUrlReply.decode(parse(xml).root), value);
});

Deno.test("smtPlayUrlReply rejects a reply without a url", () => {
  const root = parse('<SmtPlayURL version="1.1"></SmtPlayURL>').root;

  assertThrows(() => smtPlayUrlReply.decode(root), Error, "<url>");
});
