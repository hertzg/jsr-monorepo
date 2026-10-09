import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { scene } from "./scene.ts";

Deno.test("scene decodes the cmd 162 reply", () => {
  const root =
    parse('<Scene version="1.1"><sceneMode>indoor</sceneMode></Scene>')
      .root;

  assertEquals(scene.decode(root), { sceneMode: "indoor" });
});

Deno.test("scene round-trips through encode and decode", () => {
  const value = { sceneMode: "outdoor" as const };

  assertEquals(scene.decode(parse(scene.encode(value)).root), value);
});

Deno.test("scene rejects auto, which nets_scene_s2x never writes", () => {
  const root = parse("<Scene><sceneMode>auto</sceneMode></Scene>").root;

  assertThrows(() => scene.decode(root), Error, "indoor, outdoor");
});
