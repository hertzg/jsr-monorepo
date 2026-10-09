import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { ftpTask } from "./ftp-task.ts";

Deno.test("ftpTask decodes the element the firmware writes", () => {
  const motion = "1".repeat(24) + "0".repeat(144);
  const always = "1".repeat(168);
  const root = parse(
    '<FtpTask version="1.1"><channelId>1</channelId><enable>1</enable>' +
      "<typeScheduleList>" +
      `<item><type>MD</type><valueTable>${motion}</valueTable></item>` +
      `<item><type>people</type><valueTable>${always}</valueTable></item>` +
      "</typeScheduleList></FtpTask>",
  ).root;

  assertEquals(ftpTask.decode(root), {
    channelId: 1,
    enable: 1,
    typeScheduleList: [
      { type: "MD", valueTable: motion },
      { type: "people", valueTable: always },
    ],
  });
});

Deno.test("ftpTask round-trips through encode and decode", () => {
  const value = {
    channelId: 0,
    enable: 0,
    typeScheduleList: [{ type: "vehicle", valueTable: "01".repeat(84) }],
  };

  assertEquals(ftpTask.decode(parse(ftpTask.encode(value)).root), value);
});

Deno.test("ftpTask decodes a request that only switches it on", () => {
  const root = parse('<FtpTask version="1.1"><enable>1</enable></FtpTask>')
    .root;

  assertEquals(ftpTask.decode(root), { enable: 1 });
});

Deno.test("ftpTask throws on a schedule item without a valueTable", () => {
  const root = parse(
    '<FtpTask version="1.1"><typeScheduleList><item><type>MD</type></item>' +
      "</typeScheduleList></FtpTask>",
  ).root;

  assertThrows(() => ftpTask.decode(root), Error, "<valueTable>");
});
