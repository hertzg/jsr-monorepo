import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { dingdongSilentMode } from "./dingdong-silent-mode.ts";

Deno.test("dingdongSilentMode decodes the cmd 609 reply the firmware writes", () => {
  const root = parse(
    '<dingdongSilentMode version="1.1"><id>2</id><time>3600</time>' +
      "<remainTime>1800</remainTime><type>1</type></dingdongSilentMode>",
  ).root;

  assertEquals(dingdongSilentMode.decode(root), {
    id: 2,
    time: 3600,
    remainTime: 1800,
    type: 1,
  });
});

Deno.test("dingdongSilentMode decodes a cmd 610 request without remainTime", () => {
  const root = parse(
    "<dingdongSilentMode><id>1</id><time>900</time><type>0</type>" +
      "</dingdongSilentMode>",
  ).root;

  assertEquals(dingdongSilentMode.decode(root), { id: 1, time: 900, type: 0 });
});

Deno.test("dingdongSilentMode decodes a sign-extended negative time", () => {
  const root = parse(
    '<dingdongSilentMode version="1.1"><time>-1</time></dingdongSilentMode>',
  ).root;

  assertEquals(dingdongSilentMode.decode(root).time, -1);
});

Deno.test("dingdongSilentMode round-trips through encode and decode", () => {
  const value = { id: 3, time: 120, remainTime: 45, type: 2 };

  assertEquals(
    dingdongSilentMode.decode(parse(dingdongSilentMode.encode(value)).root),
    value,
  );
});
