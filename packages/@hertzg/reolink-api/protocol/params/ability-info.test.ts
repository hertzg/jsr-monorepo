import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { abilityInfo } from "./ability-info.ts";

Deno.test("abilityInfo decodes a cmd 151 reply with every module shape", () => {
  const root = parse(
    '<AbilityInfo version="1.1"><userName>admin</userName>' +
      "<system><subModule><abilityValue>general_rw, reboot_rw</abilityValue>" +
      "</subModule></system>" +
      "<streaming>" +
      "<subModule><channelId>0</channelId><abilityValue>preview_rw</abilityValue></subModule>" +
      "<subModule><channelId>1</channelId><abilityValue>snap_ro</abilityValue></subModule>" +
      "</streaming>" +
      "<alarm>" +
      "<subModule><abilityValue>hddFull_rw</abilityValue></subModule>" +
      "<subModule><channelId>0</channelId><abilityValue>motion_rw</abilityValue></subModule>" +
      "</alarm>" +
      "<disk><subModule><abilityValue>format_rw</abilityValue></subModule></disk>" +
      "</AbilityInfo>",
  ).root;

  assertEquals(abilityInfo.decode(root), {
    userName: "admin",
    system: { subModule: { abilityValue: "general_rw, reboot_rw" } },
    streaming: {
      subModule: [
        { channelId: 0, abilityValue: "preview_rw" },
        { channelId: 1, abilityValue: "snap_ro" },
      ],
    },
    alarm: {
      subModule: [
        { abilityValue: "hddFull_rw" },
        { channelId: 0, abilityValue: "motion_rw" },
      ],
    },
    disk: { subModule: { abilityValue: "format_rw" } },
  });
});

Deno.test("abilityInfo decodes a user without any module", () => {
  const root = parse(
    '<AbilityInfo version="1.1"><userName>guest</userName></AbilityInfo>',
  ).root;

  assertEquals(abilityInfo.decode(root), { userName: "guest" });
});

Deno.test("abilityInfo rejects a per-channel entry without a channel", () => {
  const root = parse(
    '<AbilityInfo version="1.1"><userName>admin</userName><record>' +
      "<subModule><abilityValue>download_ro</abilityValue></subModule>" +
      "</record></AbilityInfo>",
  ).root;

  assertThrows(() => abilityInfo.decode(root), Error, "<channelId>");
});

Deno.test("abilityInfo round-trips through encode and decode", () => {
  const value = {
    userName: "operator",
    system: { subModule: { abilityValue: "general_ro" } },
    streaming: { subModule: [{ channelId: 0, abilityValue: "preview_ro" }] },
    record: { subModule: [{ channelId: 1, abilityValue: "fileFind_ro" }] },
    network: { subModule: { abilityValue: "port_rw, dns_rw" } },
    PTZ: { subModule: { abilityValue: "control_rw" } },
    IO: { subModule: { abilityValue: "ioAlarmIn_ro" } },
    alarm: {
      subModule: [
        { abilityValue: "rfAlarm_rw" },
        { channelId: 2, abilityValue: "videoLost_ro" },
      ],
    },
    image: { subModule: [{ channelId: 3, abilityValue: "ispBasic_rw" }] },
    video: { subModule: [{ channelId: 4, abilityValue: "osdName_rw" }] },
    audio: { subModule: { abilityValue: "talk_rw" } },
    security: { subModule: { abilityValue: "userOnline_ro" } },
    replay: { subModule: [{ channelId: 5, abilityValue: "seek_ro" }] },
    disk: { subModule: { abilityValue: "hddInit_rw" } },
  };

  const xml = abilityInfo.encode(value);

  assertEquals(abilityInfo.decode(parse(xml).root), value);
});
