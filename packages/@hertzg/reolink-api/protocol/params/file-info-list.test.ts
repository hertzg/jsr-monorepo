import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { fileInfoList } from "./file-info-list.ts";

Deno.test("fileInfoList decodes a search reply entry", () => {
  const root = parse(
    '<FileInfoList version="1.1"><FileInfo>' +
      "<channelId>0</channelId><handle>0</handle><name>name-abc123</name>" +
      "<bdst>0</bdst><Id>id-def456</Id><streamType>mainStream</streamType>" +
      "<containsAudio>1</containsAudio><fileType>mp4</fileType>" +
      "<recordType>md,people</recordType><sizeL>4096</sizeL><sizeH>1</sizeH>" +
      "<supportSub>1</supportSub>" +
      "<startTime><year>2024</year><month>1</month><day>2</day><hour>3</hour>" +
      "<minute>4</minute><second>5</second></startTime>" +
      "<endTime><year>2025</year><month>6</month><day>7</day><hour>8</hour>" +
      "<minute>9</minute><second>10</second></endTime>" +
      "</FileInfo></FileInfoList>",
  ).root;

  assertEquals(fileInfoList.decode(root), {
    FileInfo: [{
      channelId: 0,
      handle: 0,
      name: "name-abc123",
      bdst: 0,
      Id: "id-def456",
      streamType: "mainStream",
      containsAudio: 1,
      fileType: "mp4",
      recordType: "md,people",
      sizeL: 4096,
      sizeH: 1,
      supportSub: 1,
      startTime: {
        year: 2024,
        month: 1,
        day: 2,
        hour: 3,
        minute: 4,
        second: 5,
      },
      endTime: { year: 2025, month: 6, day: 7, hour: 8, minute: 9, second: 10 },
    }],
  });
});

Deno.test("fileInfoList decodes every FileInfo of a search reply", () => {
  const root = parse(
    "<FileInfoList><FileInfo><name>name-first</name></FileInfo>" +
      "<FileInfo><name>name-second</name></FileInfo></FileInfoList>",
  ).root;

  assertEquals(fileInfoList.decode(root).FileInfo, [
    { name: "name-first" },
    { name: "name-second" },
  ]);
});

Deno.test("fileInfoList decodes the download cut reply", () => {
  const root = parse(
    '<FileInfoList version="1.1"><FileInfo><sizeL>4294967295</sizeL>' +
      "<sizeH>2</sizeH><FileCount>3</FileCount></FileInfo></FileInfoList>",
  ).root;

  assertEquals(fileInfoList.decode(root).FileInfo, [
    { sizeL: 4294967295, sizeH: 2, FileCount: 3 },
  ]);
});

Deno.test("fileInfoList round-trips through encode and decode", () => {
  const value = {
    FileInfo: [{
      channelId: 1,
      handle: 2,
      name: "name-ghi789",
      streamType: "subStream" as const,
      fileType: "flv" as const,
      recordType: "manual",
      startTime: {
        year: 2023,
        month: 11,
        day: 1,
        hour: 0,
        minute: 0,
        second: 0,
      },
      playSpeed: 4,
    }],
  };

  assertEquals(
    fileInfoList.decode(parse(fileInfoList.encode(value)).root),
    value,
  );
});

Deno.test("fileInfoList rejects a file type the firmware does not write", () => {
  const root = parse(
    "<FileInfoList><FileInfo><fileType>avi</fileType></FileInfo></FileInfoList>",
  ).root;

  assertThrows(() => fileInfoList.decode(root), Error, "h264, mp4, flv");
});
