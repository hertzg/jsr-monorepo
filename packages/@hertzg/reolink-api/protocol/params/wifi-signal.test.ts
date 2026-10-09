import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { wifiSignal } from "./wifi-signal.ts";

Deno.test("wifiSignal decodes the cmd 115 reply", () => {
  const root = parse(
    '<WifiSignal version="1.1"><signal>78</signal></WifiSignal>',
  ).root;

  assertEquals(wifiSignal.decode(root), { signal: 78 });
});

Deno.test("wifiSignal round-trips through encode and decode", () => {
  const value = { signal: 35 };

  const xml = wifiSignal.encode(value);

  assertEquals(wifiSignal.decode(parse(xml).root), value);
});
