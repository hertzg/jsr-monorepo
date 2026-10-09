import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { afLearn } from "./af-learn.ts";

Deno.test("afLearn decodes the channel to learn on", () => {
  const root = parse(
    '<AfLearn version="1.1"><channelId>3</channelId></AfLearn>',
  ).root;

  assertEquals(afLearn.decode(root), { channelId: 3 });
});

Deno.test("afLearn decodes an element without a channel", () => {
  const root = parse('<AfLearn version="1.1"></AfLearn>').root;

  assertEquals(afLearn.decode(root), {});
});

Deno.test("afLearn round-trips through encode and decode", () => {
  const value = { channelId: 7 };

  const xml = afLearn.encode(value);

  assertEquals(afLearn.decode(parse(xml).root), value);
});
