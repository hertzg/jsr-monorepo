import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { chargeBatteryInfo } from "./charge-battery-info.ts";

Deno.test("chargeBatteryInfo decodes the BatteryInfo reply net_bat_info_s2x writes", () => {
  const root = parse(
    '<BatteryInfo version="1.1"><channelId>0</channelId>' +
      "<chargeStatus>chargeComplete</chargeStatus><adapterStatus>solarPanel</adapterStatus>" +
      "<voltage>4180</voltage><current>-35</current><temperature>-7</temperature>" +
      "<batteryPercent>99</batteryPercent><lowPower>0</lowPower>" +
      "<batteryVersion>4</batteryVersion></BatteryInfo>",
  ).root;

  assertEquals(chargeBatteryInfo.decode(root), {
    channelId: 0,
    chargeStatus: "chargeComplete",
    adapterStatus: "solarPanel",
    voltage: 4180,
    current: -35,
    temperature: -7,
    batteryPercent: 99,
    lowPower: 0,
    batteryVersion: 4,
  });
});

Deno.test("chargeBatteryInfo round-trips a full value", () => {
  const value = {
    channelId: 1,
    chargeStatus: "charging" as const,
    adapterStatus: "adapter" as const,
    voltage: 3900,
    current: 500,
    temperature: 30,
    batteryPercent: 70,
    lowPower: 1,
    batteryVersion: 2,
  };

  assertEquals(
    chargeBatteryInfo.decode(parse(chargeBatteryInfo.encode(value)).root),
    value,
  );
});

Deno.test("chargeBatteryInfo decodes a request that carries only the channel", () => {
  const root = parse(
    '<ChargeBatteryInfo version="1.1"><channelId>0</channelId></ChargeBatteryInfo>',
  ).root;

  assertEquals(chargeBatteryInfo.decode(root), { channelId: 0 });
});

Deno.test("chargeBatteryInfo rejects an adapter state the firmware never writes", () => {
  const root = parse(
    '<BatteryInfo version="1.1"><adapterStatus>usb</adapterStatus></BatteryInfo>',
  ).root;

  assertThrows(() => chargeBatteryInfo.decode(root), Error, "usb");
});
