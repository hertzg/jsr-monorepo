import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { ptzPreset } from "./ptz-preset.ts";

Deno.test("ptzPreset decodes the cmd 190 reply", () => {
  const root = parse(
    '<PtzPreset version="1.1"><channelId>0</channelId>' +
      "<maxPresetNum>64</maxPresetNum><maxPresetPicNum>64</maxPresetPicNum>" +
      "<presetList>" +
      "<preset><id>0</id><name>name-gate</name><imageName>image-gate</imageName></preset>" +
      "<preset><id>5</id><name>name-porch</name><imageName>image-porch</imageName></preset>" +
      "</presetList></PtzPreset>",
  ).root;

  assertEquals(ptzPreset.decode(root), {
    channelId: 0,
    maxPresetNum: 64,
    maxPresetPicNum: 64,
    presetList: [
      { id: 0, name: "name-gate", imageName: "image-gate" },
      { id: 5, name: "name-porch", imageName: "image-porch" },
    ],
  });
});

Deno.test("ptzPreset round-trips a set request", () => {
  const value = {
    channelId: 1,
    presetList: [{ id: 7, name: "name-drive", command: "setPos" as const }],
  };

  assertEquals(ptzPreset.decode(parse(ptzPreset.encode(value)).root), value);
});

Deno.test("ptzPreset throws without channelId, which the firmware requires", () => {
  const root = parse(
    "<PtzPreset><presetList><preset><id>1</id></preset></presetList></PtzPreset>",
  ).root;

  assertThrows(() => ptzPreset.decode(root), Error, "<channelId>");
});

Deno.test("ptzPreset throws on a preset without id", () => {
  const root = parse(
    "<PtzPreset><channelId>0</channelId><presetList><preset>" +
      "<name>name-x</name></preset></presetList></PtzPreset>",
  ).root;

  assertThrows(() => ptzPreset.decode(root), Error, "<id>");
});
