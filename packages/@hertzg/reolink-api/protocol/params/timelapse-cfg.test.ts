import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { timelapseCfg } from "./timelapse-cfg.ts";

Deno.test("timelapseCfg decodes what net_timelapse_cfg_s2x writes", () => {
  const root = parse(
    '<timelapseCfg version="1.1"><channelId>0</channelId>' +
      "<overwrite>1</overwrite><maxFileNum>32</maxFileNum><item>" +
      "<startTime><year>2026</year><month>10</month><day>9</day>" +
      "<hour>0</hour><minute>5</minute></startTime>" +
      "<endTime><year>2027</year><month>11</month><day>10</day>" +
      "<hour>23</hour><minute>55</minute></endTime>" +
      "<duration><valid>1</valid>" +
      "<startTime><hour>6</hour><minute>1</minute><second>2</second></startTime>" +
      "<endTime><hour>18</hour><minute>3</minute><second>4</second></endTime>" +
      "</duration>" +
      "<duration><valid>0</valid>" +
      "<startTime><hour>7</hour><minute>5</minute><second>6</second></startTime>" +
      "<endTime><hour>19</hour><minute>7</minute><second>8</second></endTime>" +
      "</duration>" +
      "<enable>1</enable><neverEnd>0</neverEnd><frameRate>25</frameRate>" +
      "<buseThumbnail>1</buseThumbnail><interval>60</interval>" +
      "<streamType>subStream</streamType><taskType>jpeg</taskType>" +
      "<id>task-abc</id><properties>props-abc</properties></item></timelapseCfg>",
  ).root;

  assertEquals(timelapseCfg.decode(root), {
    channelId: 0,
    overwrite: 1,
    maxFileNum: 32,
    item: {
      startTime: { year: 2026, month: 10, day: 9, hour: 0, minute: 5 },
      endTime: { year: 2027, month: 11, day: 10, hour: 23, minute: 55 },
      duration: [
        {
          valid: 1,
          startTime: { hour: 6, minute: 1, second: 2 },
          endTime: { hour: 18, minute: 3, second: 4 },
        },
        {
          valid: 0,
          startTime: { hour: 7, minute: 5, second: 6 },
          endTime: { hour: 19, minute: 7, second: 8 },
        },
      ],
      enable: 1,
      neverEnd: 0,
      frameRate: 25,
      buseThumbnail: 1,
      interval: 60,
      streamType: "subStream",
      taskType: "jpeg",
      id: "task-abc",
      properties: "props-abc",
    },
  });
});

Deno.test("timelapseCfg decodes a reply with no task", () => {
  const root = parse(
    '<timelapseCfg version="1.1"><channelId>0</channelId>' +
      "<overwrite>0</overwrite><maxFileNum>16</maxFileNum></timelapseCfg>",
  ).root;

  assertEquals(timelapseCfg.decode(root), {
    channelId: 0,
    overwrite: 0,
    maxFileNum: 16,
  });
});

Deno.test("timelapseCfg round-trips every field", () => {
  const value = {
    channelId: 1,
    overwrite: 1,
    maxFileNum: 8,
    item: {
      startTime: {
        year: 2025,
        month: 1,
        day: 2,
        hour: 3,
        minute: 4,
        second: 5,
      },
      endTime: { year: 2025, month: 6, day: 7, hour: 8, minute: 9, second: 10 },
      duration: [{
        valid: 1,
        startTime: { hour: 11, minute: 12, second: 13 },
        endTime: { hour: 14, minute: 15, second: 16 },
      }],
      enable: 0,
      neverEnd: 1,
      frameRate: 30,
      buseThumbnail: 0,
      interval: 120,
      streamType: "externStream" as const,
      taskType: "mp4" as const,
      id: "task-xyz",
      properties: "props-xyz",
    },
  };

  assertEquals(
    timelapseCfg.decode(parse(timelapseCfg.encode(value)).root),
    value,
  );
});

Deno.test("timelapseCfg throws on a taskType the firmware does not map", () => {
  const root = parse(
    '<timelapseCfg version="1.1"><item><taskType>gif</taskType></item></timelapseCfg>',
  ).root;

  assertThrows(() => timelapseCfg.decode(root), Error, "gif");
});
