import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { abilitySuppport } from "./ability-suppport.ts";

Deno.test("abilitySuppport decodes every field nets_ability_support_s2x writes", () => {
  const root = parse(
    '<AbilitySuppport version="1.1"><userName>admin</userName>' +
      "<system>1</system><streaming>1</streaming><record>0</record>" +
      "<network>1</network><PTZ>0</PTZ><IO>1</IO><alarm>0</alarm>" +
      "<image>1</image><video>0</video><audio>1</audio><security>0</security>" +
      "<replay>1</replay><disk>0</disk></AbilitySuppport>",
  ).root;

  assertEquals(abilitySuppport.decode(root), {
    userName: "admin",
    system: 1,
    streaming: 1,
    record: 0,
    network: 1,
    PTZ: 0,
    IO: 1,
    alarm: 0,
    image: 1,
    video: 0,
    audio: 1,
    security: 0,
    replay: 1,
    disk: 0,
  });
});

Deno.test("abilitySuppport round-trips a partial element", () => {
  const value = { userName: "guest", streaming: 1, replay: 0 };

  assertEquals(
    abilitySuppport.decode(parse(abilitySuppport.encode(value)).root),
    value,
  );
});
