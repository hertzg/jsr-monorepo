import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { requestIframe } from "./request-iframe.ts";

Deno.test("requestIframe decodes a cmd 189 request", () => {
  const root = parse(
    '<RequestIframe version="1.1"><channelId>1</channelId>' +
      "<streamType>externStream</streamType></RequestIframe>",
  ).root;

  assertEquals(requestIframe.decode(root), {
    channelId: 1,
    streamType: "externStream",
  });
});

Deno.test("requestIframe decodes an empty element", () => {
  const root = parse('<RequestIframe version="1.1"></RequestIframe>').root;

  assertEquals(requestIframe.decode(root), {});
});

Deno.test("requestIframe rejects an unknown stream type", () => {
  const root = parse(
    '<RequestIframe version="1.1"><streamType>thirdStream</streamType></RequestIframe>',
  ).root;

  assertThrows(() => requestIframe.decode(root), Error, "<streamType>");
});

Deno.test("requestIframe round-trips through encode and decode", () => {
  const value = { channelId: 4, streamType: "mobileStream" as const };

  const xml = requestIframe.encode(value);

  assertEquals(requestIframe.decode(parse(xml).root), value);
});
