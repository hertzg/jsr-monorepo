import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { hddInitList } from "./hdd-init-list.ts";

Deno.test("hddInitList decodes several devices in order", () => {
  const root = parse(
    '<HddInitList version="1.1"><HddInit><initId>0</initId></HddInit>' +
      "<HddInit><initId>101</initId></HddInit></HddInitList>",
  ).root;

  assertEquals(hddInitList.decode(root), {
    HddInit: [{ initId: 0 }, { initId: 101 }],
  });
});

Deno.test("hddInitList round-trips through encode and decode", () => {
  const value = { HddInit: [{ initId: 3 }, { initId: 4 }] };

  assertEquals(
    hddInitList.decode(parse(hddInitList.encode(value)).root),
    value,
  );
});

Deno.test("hddInitList decodes an entry without initId, which the firmware tolerates", () => {
  const root =
    parse('<HddInitList version="1.1"><HddInit></HddInit></HddInitList>')
      .root;

  assertEquals(hddInitList.decode(root), { HddInit: [{}] });
});
