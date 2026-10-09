import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { inputAdvanceCfg } from "./input-advance-cfg.ts";

Deno.test("inputAdvanceCfg decodes the full reply the camera writes", () => {
  const root = parse(
    '<InputAdvanceCfg version="1.1"><channelId>0</channelId>' +
      "<digitalChannel>1</digitalChannel>" +
      "<PowerLineFrequency><mode>60hz</mode><enable>1</enable></PowerLineFrequency>" +
      "<Exposure><mode>manual</mode>" +
      "<Gainctl><defMin>1</defMin><defMax>100</defMax><curMin>2</curMin><curMax>90</curMax></Gainctl>" +
      "<Shutterctl><defMin>0</defMin><defMax>125</defMax><curMin>3</curMin><curMax>80</curMax></Shutterctl>" +
      "<shutterLevel>1/250</shutterLevel><gainLevel>40</gainLevel></Exposure>" +
      "<Scene><mode>outdoor</mode><modeList>auto, manual</modeList>" +
      "<Redgain><min>0</min><max>255</max><cur>128</cur></Redgain>" +
      "<Bluegain><min>1</min><max>254</max><cur>127</cur></Bluegain></Scene>" +
      "<DayNight><mode>auto</mode><IrcutMode>ir</IrcutMode><Threshold>medium</Threshold></DayNight>" +
      "<BLC><enable>1</enable><mode>dynamicRange</mode>" +
      "<backlight><min>0</min><max>255</max><cur>64</cur></backlight>" +
      "<dynamicrange><min>1</min><max>250</max><cur>65</cur></dynamicrange></BLC>" +
      "<bdDayColor><mode>auto</mode><bright><min>0</min><max>255</max><cur>10</cur></bright>" +
      "<dark><min>0</min><max>255</max><cur>20</cur></dark></bdDayColor>" +
      "<mirror>1</mirror><flip>0</flip>" +
      "<Iris><enable>1</enable><state>success</state><focusAutoiris>2</focusAutoiris></Iris>" +
      "<nr3d><value>low</value><enable>1</enable></nr3d>" +
      "<firstFrameStrategy>0</firstFrameStrategy>" +
      "<binning_mode>3</binning_mode><encTypeAbility>4</encTypeAbility><encType>5</encType>" +
      "</InputAdvanceCfg>",
  ).root;

  assertEquals(inputAdvanceCfg.decode(root), {
    channelId: 0,
    digitalChannel: 1,
    PowerLineFrequency: { mode: "60hz", enable: 1 },
    Exposure: {
      mode: "manual",
      Gainctl: { defMin: 1, defMax: 100, curMin: 2, curMax: 90 },
      Shutterctl: { defMin: 0, defMax: 125, curMin: 3, curMax: 80 },
      shutterLevel: "1/250",
      gainLevel: 40,
    },
    Scene: {
      mode: "outdoor",
      modeList: "auto, manual",
      Redgain: { min: 0, max: 255, cur: 128 },
      Bluegain: { min: 1, max: 254, cur: 127 },
    },
    DayNight: { mode: "auto", IrcutMode: "ir", Threshold: "medium" },
    BLC: {
      enable: 1,
      mode: "dynamicRange",
      backlight: { min: 0, max: 255, cur: 64 },
      dynamicrange: { min: 1, max: 250, cur: 65 },
    },
    bdDayColor: {
      mode: "auto",
      bright: { min: 0, max: 255, cur: 10 },
      dark: { min: 0, max: 255, cur: 20 },
    },
    mirror: 1,
    flip: 0,
    Iris: { enable: 1, state: "success", focusAutoiris: 2 },
    nr3d: { value: "low", enable: 1 },
    firstFrameStrategy: 0,
    binning_mode: 3,
    encTypeAbility: 4,
    encType: 5,
  });
});

Deno.test("inputAdvanceCfg decodes a channel without ISP settings", () => {
  const root = parse(
    '<InputAdvanceCfg version="1.1"><channelId>3</channelId>' +
      "<digitalChannel>0</digitalChannel></InputAdvanceCfg>",
  ).root;

  assertEquals(inputAdvanceCfg.decode(root), {
    channelId: 3,
    digitalChannel: 0,
  });
});

Deno.test("inputAdvanceCfg round-trips through encode and decode", () => {
  const value = {
    channelId: 1,
    Exposure: { mode: "gainFist" as const, gainLevel: 55 },
    bdNight: { mode: "manual" as const, dark: { cur: 30 } },
    nr3d: { value: "off" as const },
    constantFrameRate: 1,
    constantFrameRateAbility: 1,
    hdrAbility: 1,
    hdrSwitch: 2,
  };

  assertEquals(
    inputAdvanceCfg.decode(parse(inputAdvanceCfg.encode(value)).root),
    value,
  );
});

Deno.test("inputAdvanceCfg throws on a bright/dark block without mode", () => {
  const root = parse(
    "<InputAdvanceCfg><bdNightColor><bright><cur>1</cur></bright>" +
      "</bdNightColor></InputAdvanceCfg>",
  ).root;

  assertThrows(() => inputAdvanceCfg.decode(root), Error, "<mode>");
});

Deno.test("inputAdvanceCfg rejects a shutter level the firmware does not name", () => {
  const root = parse(
    "<InputAdvanceCfg><Exposure><shutterLevel>1/90</shutterLevel>" +
      "</Exposure></InputAdvanceCfg>",
  ).root;

  assertThrows(() => inputAdvanceCfg.decode(root), Error, "1/10000");
});
