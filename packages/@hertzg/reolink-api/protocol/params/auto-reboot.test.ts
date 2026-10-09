import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { autoReboot } from "./auto-reboot.ts";

Deno.test("autoReboot decodes the element the firmware writes", () => {
  const root = parse(
    '<AutoReboot version="1.1"><enable>1</enable><weekDay>Wednesday</weekDay>' +
      "<hour>2</hour><minute>45</minute><second>30</second></AutoReboot>",
  ).root;

  assertEquals(autoReboot.decode(root), {
    enable: 1,
    weekDay: "Wednesday",
    hour: 2,
    minute: 45,
    second: 30,
  });
});

Deno.test("autoReboot round-trips through encode and decode", () => {
  const value = {
    enable: 0,
    weekDay: "everyday" as const,
    hour: 23,
    minute: 59,
    second: 58,
  };

  assertEquals(autoReboot.decode(parse(autoReboot.encode(value)).root), value);
});

Deno.test("autoReboot rejects a day spelling the firmware never writes", () => {
  const root = parse(
    '<AutoReboot version="1.1"><weekDay>Everyday</weekDay></AutoReboot>',
  ).root;

  assertThrows(() => autoReboot.decode(root), Error, '"Everyday"');
});

Deno.test("autoReboot encodes a request that only switches it off", () => {
  assertEquals(
    autoReboot.encode({ enable: 0 }),
    '<AutoReboot version="1.1"><enable>0</enable></AutoReboot>',
  );
});
