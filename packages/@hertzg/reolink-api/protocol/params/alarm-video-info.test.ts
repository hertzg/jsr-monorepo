import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { alarmVideoInfo } from "./alarm-video-info.ts";

Deno.test("alarmVideoInfo decodes the cmd 273 reply", () => {
  const root = parse(
    '<alarmVideoInfo version="1.1"><channelId>0</channelId>' +
      "<fileHandle>7</fileHandle><bFinished>0</bFinished><alarmVideoList>" +
      "<alarmVideo><fileName>0120250314081502</fileName>" +
      "<alarmType>visitor</alarmType><fileId>Rec_20250314_081502</fileId>" +
      "<typeExtension>2</typeExtension>" +
      "<startTime><year>2025</year><month>3</month><day>14</day>" +
      "<hour>8</hour><minute>15</minute><second>2</second></startTime>" +
      "<endTime><year>2025</year><month>3</month><day>14</day>" +
      "<hour>8</hour><minute>15</minute><second>31</second></endTime>" +
      "</alarmVideo></alarmVideoList></alarmVideoInfo>",
  ).root;

  assertEquals(alarmVideoInfo.decode(root), {
    channelId: 0,
    fileHandle: 7,
    bFinished: 0,
    alarmVideoList: [{
      fileName: "0120250314081502",
      alarmType: "visitor",
      fileId: "Rec_20250314_081502",
      typeExtension: 2,
      startTime: {
        year: 2025,
        month: 3,
        day: 14,
        hour: 8,
        minute: 15,
        second: 2,
      },
      endTime: {
        year: 2025,
        month: 3,
        day: 14,
        hour: 8,
        minute: 15,
        second: 31,
      },
    }],
  });
});

Deno.test("alarmVideoInfo reads a recording without a type extension", () => {
  const root = parse(
    '<alarmVideoInfo version="1.1"><channelId>0</channelId>' +
      "<fileHandle>7</fileHandle><bFinished>1</bFinished><alarmVideoList>" +
      "<alarmVideo><fileName>0120250314090000</fileName>" +
      "<alarmType>md</alarmType><fileId>Rec_20250314_090000</fileId>" +
      "<startTime><year>2025</year><month>3</month><day>14</day>" +
      "<hour>9</hour><minute>0</minute><second>0</second></startTime>" +
      "<endTime><year>2025</year><month>3</month><day>14</day>" +
      "<hour>9</hour><minute>0</minute><second>20</second></endTime>" +
      "</alarmVideo></alarmVideoList></alarmVideoInfo>",
  ).root;

  assertEquals(
    alarmVideoInfo.decode(root).alarmVideoList[0].typeExtension,
    undefined,
  );
});

Deno.test("alarmVideoInfo round-trips through encode and decode", () => {
  const value = {
    channelId: 0,
    fileHandle: 12,
    bFinished: 1,
    alarmVideoList: [
      {
        fileName: "0120250101000005",
        alarmType: "package",
        fileId: "Rec_20250101_000005",
        typeExtension: 1,
        startTime: {
          year: 2025,
          month: 1,
          day: 1,
          hour: 0,
          minute: 0,
          second: 5,
        },
        endTime: {
          year: 2025,
          month: 1,
          day: 1,
          hour: 0,
          minute: 0,
          second: 45,
        },
      },
      {
        fileName: "0120250101120000",
        alarmType: "",
        fileId: "Rec_20250101_120000",
        startTime: {
          year: 2025,
          month: 1,
          day: 1,
          hour: 12,
          minute: 0,
          second: 0,
        },
        endTime: {
          year: 2025,
          month: 1,
          day: 1,
          hour: 12,
          minute: 1,
          second: 0,
        },
      },
    ],
  };

  const xml = alarmVideoInfo.encode(value);

  assertEquals(alarmVideoInfo.decode(parse(xml).root), value);
});
