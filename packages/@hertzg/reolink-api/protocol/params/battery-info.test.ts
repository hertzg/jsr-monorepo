import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { batteryInfo } from "./battery-info.ts";

Deno.test("batteryInfo decodes the cmd 253 reply", () => {
  const root = parse(
    '<BatteryInfo version="1.1"><channelId>0</channelId>' +
      "<chargeStatus>charging</chargeStatus><adapterStatus>solarPanel</adapterStatus>" +
      "<voltage>8120</voltage><current>-35</current><temperature>27</temperature>" +
      "<batteryPercent>86</batteryPercent><lowPower>0</lowPower>" +
      "<batteryVersion>2</batteryVersion></BatteryInfo>",
  ).root;

  assertEquals(batteryInfo.decode(root), {
    channelId: 0,
    chargeStatus: "charging",
    adapterStatus: "solarPanel",
    voltage: 8120,
    current: -35,
    temperature: 27,
    batteryPercent: 86,
    lowPower: 0,
    batteryVersion: 2,
  });
});

Deno.test("batteryInfo round-trips through encode and decode", () => {
  const value = {
    channelId: 0,
    chargeStatus: "none" as const,
    adapterStatus: "adapter" as const,
    voltage: 7400,
    current: 120,
    temperature: -5,
    batteryPercent: 9,
    lowPower: 1,
    batteryVersion: 1,
  };

  const xml = batteryInfo.encode(value);

  assertEquals(batteryInfo.decode(parse(xml).root), value);
});

Deno.test("batteryInfo rejects an unknown charge state", () => {
  const root = parse(
    '<BatteryInfo version="1.1"><channelId>0</channelId>' +
      "<chargeStatus>draining</chargeStatus><adapterStatus>none</adapterStatus>" +
      "<voltage>8120</voltage><current>0</current><temperature>20</temperature>" +
      "<batteryPercent>50</batteryPercent><lowPower>0</lowPower>" +
      "<batteryVersion>1</batteryVersion></BatteryInfo>",
  ).root;

  assertThrows(() => batteryInfo.decode(root), Error, "draining");
});
