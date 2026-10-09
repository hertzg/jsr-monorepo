import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { autoReply } from "./auto-reply.ts";

Deno.test("autoReply decodes a cmd 427 reply with every field", () => {
  const root = parse(
    '<AutoReply version="1.1"><enable>1</enable><timeout>15</timeout>' +
      "<audioId>2</audioId><extId>ext-busy</extId>" +
      "<fileName>busy.wav</fileName><fesEnable>1</fesEnable>" +
      "<fesAudioId>3</fesAudioId><fesExtId>ext-away</fesExtId>" +
      "<fesFileName>away.wav</fesFileName>" +
      "<startTime><year>2026</year><month>1</month><day>2</day>" +
      "<hour>3</hour><min>4</min><sec>5</sec></startTime>" +
      "<endTime><year>2027</year><month>6</month><day>7</day>" +
      "<hour>8</hour><min>9</min><sec>10</sec></endTime>" +
      "<current>1</current></AutoReply>",
  ).root;

  assertEquals(autoReply.decode(root), {
    enable: 1,
    timeout: 15,
    audioId: 2,
    extId: "ext-busy",
    fileName: "busy.wav",
    fesEnable: 1,
    fesAudioId: 3,
    fesExtId: "ext-away",
    fesFileName: "away.wav",
    startTime: { year: 2026, month: 1, day: 2, hour: 3, min: 4, sec: 5 },
    endTime: { year: 2027, month: 6, day: 7, hour: 8, min: 9, sec: 10 },
    current: 1,
  });
});

Deno.test("autoReply decodes a reply without the empty name strings", () => {
  const root = parse(
    '<AutoReply version="1.1"><enable>0</enable><timeout>10</timeout>' +
      "<audioId>1</audioId><fesEnable>0</fesEnable><fesAudioId>4</fesAudioId>" +
      "<current>0</current></AutoReply>",
  ).root;

  assertEquals(autoReply.decode(root), {
    enable: 0,
    timeout: 10,
    audioId: 1,
    fesEnable: 0,
    fesAudioId: 4,
    current: 0,
  });
});

Deno.test("autoReply round-trips through encode and decode", () => {
  const value = {
    enable: 1,
    timeout: 20,
    audioId: 5,
    extId: "ext-hello",
    fileName: "hello.wav",
    fesEnable: 0,
    fesAudioId: 6,
    fesExtId: "ext-later",
    fesFileName: "later.wav",
    startTime: { year: 2025, month: 2, day: 3, hour: 4, min: 5, sec: 6 },
    endTime: { year: 2025, month: 7, day: 8, hour: 9, min: 10, sec: 11 },
    current: 0,
  };

  const xml = autoReply.encode(value);

  assertEquals(autoReply.decode(parse(xml).root), value);
});
