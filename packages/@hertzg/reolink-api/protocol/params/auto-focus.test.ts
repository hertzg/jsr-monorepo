import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { autoFocus } from "./auto-focus.ts";

Deno.test("autoFocus decodes the reply nets_auto_focus_get writes", () => {
  const root = parse(
    '<AutoFocus version="1.1"><channelId>1</channelId><disable>1</disable></AutoFocus>',
  ).root;

  assertEquals(autoFocus.decode(root), { channelId: 1, disable: 1 });
});

Deno.test("autoFocus round-trips a full value", () => {
  const value = { channelId: 2, disable: 0 };

  assertEquals(autoFocus.decode(parse(autoFocus.encode(value)).root), value);
});

Deno.test("autoFocus decodes a request that carries only the channel", () => {
  const root = parse(
    '<AutoFocus version="1.1"><channelId>0</channelId></AutoFocus>',
  ).root;

  assertEquals(autoFocus.decode(root), { channelId: 0 });
});
