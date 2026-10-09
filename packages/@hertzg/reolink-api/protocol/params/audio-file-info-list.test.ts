import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { audioFileInfoList } from "./audio-file-info-list.ts";

Deno.test("audioFileInfoList decodes a cmd 347 reply with two files", () => {
  const root = parse(
    '<audioFileInfoList version="1.1">' +
      "<audioFileInfo><id>3</id><fileSize>48000</fileSize>" +
      "<audioLen>6</audioLen><fileName>welcome.wav</fileName>" +
      "<extId>ext-welcome</extId><type>reply</type></audioFileInfo>" +
      "<audioFileInfo><id>4</id><fileSize>96000</fileSize>" +
      "<audioLen>12</audioLen><fileName>siren.wav</fileName>" +
      "<extId>ext-siren</extId><type>alarm</type></audioFileInfo>" +
      "<maxFileNumber>12</maxFileNumber></audioFileInfoList>",
  ).root;

  assertEquals(audioFileInfoList.decode(root), {
    audioFileInfo: [
      {
        id: 3,
        fileSize: 48000,
        audioLen: 6,
        fileName: "welcome.wav",
        extId: "ext-welcome",
        type: "reply",
      },
      {
        id: 4,
        fileSize: 96000,
        audioLen: 12,
        fileName: "siren.wav",
        extId: "ext-siren",
        type: "alarm",
      },
    ],
    maxFileNumber: 12,
  });
});

Deno.test("audioFileInfoList decodes a cmd 368 request with only the fields the parser reads", () => {
  const root = parse(
    "<audioFileInfoList><audioFileInfo><fileName>door.wav</fileName>" +
      "<id>5</id><extId>ext-door</extId></audioFileInfo></audioFileInfoList>",
  ).root;

  assertEquals(audioFileInfoList.decode(root), {
    audioFileInfo: [{ id: 5, fileName: "door.wav", extId: "ext-door" }],
  });
});

Deno.test("audioFileInfoList decodes an empty list as no files", () => {
  const root = parse(
    '<audioFileInfoList version="1.1"><maxFileNumber>12</maxFileNumber>' +
      "</audioFileInfoList>",
  ).root;

  assertEquals(audioFileInfoList.decode(root).audioFileInfo, []);
});

Deno.test("audioFileInfoList rejects an unknown file type", () => {
  const root = parse(
    "<audioFileInfoList><audioFileInfo><type>ringtone</type></audioFileInfo>" +
      "</audioFileInfoList>",
  ).root;

  assertThrows(() => audioFileInfoList.decode(root), Error, '"ringtone"');
});

Deno.test("audioFileInfoList round-trips through encode and decode", () => {
  const value = {
    audioFileInfo: [{
      id: 7,
      fileSize: 1024,
      audioLen: 2,
      fileName: "chime.wav",
      extId: "ext-chime",
      type: "alarm" as const,
    }],
    maxFileNumber: 12,
  };

  const xml = audioFileInfoList.encode(value);

  assertEquals(audioFileInfoList.decode(parse(xml).root), value);
});

Deno.test("audioFileInfoList reads the RLC-823A cmd 347 reply's <item> files", () => {
  const root = parse(
    '<audioFileInfoList version="1.1">' +
      "<item><id>2</id><fileSize>2048</fileSize><audioLen>5</audioLen>" +
      "<customName>front-door-greeting</customName></item>" +
      "</audioFileInfoList>",
  ).root;

  assertEquals(audioFileInfoList.decode(root), {
    audioFileInfo: [],
    item: [{
      id: 2,
      fileSize: 2048,
      audioLen: 5,
      customName: "front-door-greeting",
    }],
  });
});
