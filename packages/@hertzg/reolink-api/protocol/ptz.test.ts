import { assertEquals } from "@std/assert";
import { parsePtzPresets, ptzControlXml, ptzPresetXml } from "./ptz.ts";

Deno.test("ptzControlXml leaves out speed when not given", () => {
  assertEquals(
    ptzControlXml({ channel: 0, command: "Stop" }),
    '<?xml version="1.0" encoding="UTF-8" ?>\n' +
      "<body>\n" +
      '<PtzControl version="1.1">\n' +
      "<channelId>0</channelId>\n" +
      "<command>Stop</command>\n" +
      "</PtzControl>\n" +
      "</body>\n",
  );
});

Deno.test("ptzControlXml adds speed after the command", () => {
  assertEquals(
    ptzControlXml({ channel: 1, command: "ZoomInc", speed: 5 }),
    '<?xml version="1.0" encoding="UTF-8" ?>\n' +
      "<body>\n" +
      '<PtzControl version="1.1">\n' +
      "<channelId>1</channelId>\n" +
      "<command>ZoomInc</command>\n" +
      "<speed>5</speed>\n" +
      "</PtzControl>\n" +
      "</body>\n",
  );
});

Deno.test("ptzPresetXml moves to a preset with toPos", () => {
  assertEquals(
    ptzPresetXml({ channel: 0, id: 4 }),
    '<?xml version="1.0" encoding="UTF-8" ?>\n' +
      "<body>\n" +
      '<PtzPreset version="1.1">\n' +
      "<channelId>0</channelId>\n" +
      "<presetList>\n" +
      "<preset>\n" +
      "<id>4</id>\n" +
      "<command>toPos</command>\n" +
      "</preset>\n" +
      "</presetList>\n" +
      "</PtzPreset>\n" +
      "</body>\n",
  );
});

Deno.test("parsePtzPresets skips slots without a name", () => {
  assertEquals(
    parsePtzPresets(
      "<body><PtzPreset><channelId>0</channelId><presetList>" +
        "<preset><id>1</id><name>gate</name></preset>" +
        "<preset><id>2</id></preset>" +
        "<preset><id>3</id><name>porch</name></preset>" +
        "</presetList></PtzPreset></body>",
    ),
    [{ id: 1, name: "gate" }, { id: 3, name: "porch" }],
  );
});

Deno.test("parsePtzPresets returns nothing for an empty list", () => {
  assertEquals(parsePtzPresets("<body><PtzPreset /></body>"), []);
});
