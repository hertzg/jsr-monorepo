import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { batteryList } from "./battery-list.ts";

Deno.test("batteryList decodes the cmd 252 push nets_battery_status_report writes", () => {
  const root = parse(
    '<BatteryList version="1.1"><BatteryInfo><channelId>0</channelId>' +
      "<chargeStatus>charging</chargeStatus><adapterStatus>adapter</adapterStatus>" +
      "<voltage>3987</voltage><current>-120</current><temperature>-4</temperature>" +
      "<batteryPercent>64</batteryPercent><lowPower>1</lowPower>" +
      "<batteryVersion>3</batteryVersion></BatteryInfo></BatteryList>",
  ).root;

  assertEquals(batteryList.decode(root), {
    BatteryInfo: {
      channelId: 0,
      chargeStatus: "charging",
      adapterStatus: "adapter",
      voltage: 3987,
      current: -120,
      temperature: -4,
      batteryPercent: 64,
      lowPower: 1,
      batteryVersion: 3,
    },
  });
});

Deno.test("batteryList round-trips a full value", () => {
  const value = {
    BatteryInfo: {
      channelId: 0,
      chargeStatus: "none" as const,
      adapterStatus: "solarPanel" as const,
      voltage: 3700,
      current: 15,
      temperature: 31,
      batteryPercent: 42,
      lowPower: 0,
      batteryVersion: 2,
    },
  };

  assertEquals(
    batteryList.decode(parse(batteryList.encode(value)).root),
    value,
  );
});

Deno.test("batteryList rejects a push without BatteryInfo", () => {
  const root = parse('<BatteryList version="1.1"></BatteryList>').root;

  assertThrows(() => batteryList.decode(root), Error, "BatteryInfo");
});

Deno.test("batteryList rejects a charge state the firmware never writes", () => {
  const root = parse(
    '<BatteryList version="1.1"><BatteryInfo><channelId>0</channelId>' +
      "<chargeStatus>discharging</chargeStatus><adapterStatus>none</adapterStatus>" +
      "<voltage>0</voltage><current>0</current><temperature>0</temperature>" +
      "<batteryPercent>0</batteryPercent><lowPower>0</lowPower>" +
      "<batteryVersion>0</batteryVersion></BatteryInfo></BatteryList>",
  ).root;

  assertThrows(() => batteryList.decode(root), Error, "discharging");
});
