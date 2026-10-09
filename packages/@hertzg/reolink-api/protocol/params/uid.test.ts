import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { uid } from "./uid.ts";

Deno.test("uid decodes the cmd 114 reply", () => {
  const root = parse(
    '<Uid version="1.1"><uid>95270000ABCDEFGH</uid></Uid>',
  ).root;

  assertEquals(uid.decode(root), { uid: "95270000ABCDEFGH" });
});

Deno.test("uid round-trips through encode and decode", () => {
  const value = { uid: "95270000ZYXWVUTS" };

  const xml = uid.encode(value);

  assertEquals(uid.decode(parse(xml).root), value);
});
