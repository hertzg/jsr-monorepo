import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { aiDetectCfg } from "./ai-detect-cfg.ts";

Deno.test("aiDetectCfg decodes the reply the camera writes", () => {
  const root = parse(
    '<AiDetectCfg version="1.1"><chn>1</chn><type>dog_cat</type>' +
      "<sensitivity>61</sensitivity><stayTime>3</stayTime>" +
      "<minTargetHeight>0.125</minTargetHeight><minTargetWidth>0.25</minTargetWidth>" +
      "<maxTargetHeight>0.75</maxTargetHeight><maxTargetWidth>0.875</maxTargetWidth>" +
      "<width>8</width><height>1</height><area>AQEBAQAAAAA=</area></AiDetectCfg>",
  ).root;

  assertEquals(aiDetectCfg.decode(root), {
    chn: 1,
    type: "dog_cat",
    sensitivity: 61,
    stayTime: 3,
    minTargetHeight: 0.125,
    minTargetWidth: 0.25,
    maxTargetHeight: 0.75,
    maxTargetWidth: 0.875,
    width: 8,
    height: 1,
    area: "AQEBAQAAAAA=",
  });
});

Deno.test("aiDetectCfg round-trips through encode and decode", () => {
  const value = {
    chn: 0,
    type: "face" as const,
    sensitivity: 42,
    stayTime: 5,
    minTargetHeight: 0.0625,
    minTargetWidth: 0.03125,
    maxTargetHeight: 0.5,
    maxTargetWidth: 0.375,
    width: 2,
    height: 2,
    area: "AQABAA==",
  };

  const xml = aiDetectCfg.encode(value);

  assertEquals(aiDetectCfg.decode(parse(xml).root), value);
});

Deno.test("aiDetectCfg decodes a reply whose grid failed to encode", () => {
  const root = parse(
    '<AiDetectCfg version="1.1"><chn>0</chn><type>other</type>' +
      "<sensitivity>10</sensitivity><stayTime>0</stayTime>" +
      "<minTargetHeight>0</minTargetHeight><minTargetWidth>0</minTargetWidth>" +
      "<maxTargetHeight>1</maxTargetHeight><maxTargetWidth>1</maxTargetWidth>" +
      "<width>155</width><height>100</height></AiDetectCfg>",
  ).root;

  assertEquals(aiDetectCfg.decode(root).area, undefined);
});

Deno.test("aiDetectCfg rejects a target type the firmware does not map", () => {
  const root = parse(
    '<AiDetectCfg version="1.1"><type>bicycle</type></AiDetectCfg>',
  ).root;

  assertThrows(() => aiDetectCfg.decode(root), Error, "type");
});
