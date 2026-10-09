import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { ledState } from "./led-state.ts";

Deno.test("ledState decodes the cmd 208 reply", () => {
  const root = parse(
    '<LedState version="1.1"><channelId>1</channelId><ledVersion>2</ledVersion>' +
      "<state>open</state><lightState>close</lightState></LedState>",
  ).root;

  assertEquals(ledState.decode(root), {
    channelId: 1,
    ledVersion: 2,
    state: "open",
    lightState: "close",
  });
});

Deno.test("ledState decodes a request with only the status light", () => {
  const root = parse(
    '<LedState version="1.1"><lightState>open</lightState></LedState>',
  ).root;

  assertEquals(ledState.decode(root), { lightState: "open" });
});

Deno.test("ledState rejects an unknown infrared mode", () => {
  const root = parse('<LedState version="1.1"><state>dim</state></LedState>')
    .root;

  assertThrows(() => ledState.decode(root), Error, "<state>");
});

Deno.test("ledState round-trips through encode and decode", () => {
  const value = {
    channelId: 0,
    ledVersion: 1,
    state: "auto" as const,
    lightState: "open" as const,
  };

  const xml = ledState.encode(value);

  assertEquals(ledState.decode(parse(xml).root), value);
});
