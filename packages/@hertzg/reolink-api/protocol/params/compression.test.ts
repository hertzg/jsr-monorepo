import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { compression } from "./compression.ts";

Deno.test("compression decodes an RLC-823A cmd 56 reply", () => {
  const root = parse(
    '<Compression version="1.1"><channelId>0</channelId>' +
      "<isNoTranslateFrame>0</isNoTranslateFrame>" +
      "<mainStream><audio>1</audio><resolutionName>3840*2160</resolutionName>" +
      "<width>3840</width><height>2160</height><frame>25</frame>" +
      "<bitRate>6144</bitRate><encoderProfile>high</encoderProfile>" +
      "<gop><cur>2</cur><max>4</max><min>1</min></gop></mainStream>" +
      "<subStream><audio>0</audio><resolutionName>640*360</resolutionName>" +
      "<width>640</width><height>360</height><frame>15</frame>" +
      "<bitRate>256</bitRate><encoderProfile>main</encoderProfile>" +
      "<gop><cur>3</cur><max>5</max><min>2</min></gop></subStream>" +
      "<thirdStream><audio>1</audio><resolutionName>1280*720</resolutionName>" +
      "<width>1280</width><height>720</height><frame>20</frame>" +
      "<bitRate>1024</bitRate><encoderProfile>baseLine</encoderProfile>" +
      "</thirdStream></Compression>",
  ).root;

  assertEquals(compression.decode(root), {
    channelId: 0,
    isNoTranslateFrame: 0,
    mainStream: {
      audio: 1,
      resolutionName: "3840*2160",
      width: 3840,
      height: 2160,
      frame: 25,
      bitRate: 6144,
      encoderProfile: "high",
      gop: { cur: 2, max: 4, min: 1 },
    },
    subStream: {
      audio: 0,
      resolutionName: "640*360",
      width: 640,
      height: 360,
      frame: 15,
      bitRate: 256,
      encoderProfile: "main",
      gop: { cur: 3, max: 5, min: 2 },
    },
    thirdStream: {
      audio: 1,
      resolutionName: "1280*720",
      width: 1280,
      height: 720,
      frame: 20,
      bitRate: 1024,
      encoderProfile: "baseLine",
    },
  });
});

Deno.test("compression round-trips a main stream update", () => {
  const value = {
    channelId: 0,
    mainStream: {
      frame: 30,
      bitRate: 8192,
      encoderProfile: "default",
      gop: { cur: 2 },
    },
  } as const;

  assertEquals(
    compression.decode(parse(compression.encode(value)).root),
    value,
  );
});

Deno.test("compression rejects an unknown encoder profile", () => {
  const root = parse(
    '<Compression version="1.1"><subStream><encoderProfile>extended' +
      "</encoderProfile></subStream></Compression>",
  ).root;

  assertThrows(() => compression.decode(root), Error, '"extended"');
});

Deno.test("compression decodes a Video Doorbell PoE cmd 56 reply", () => {
  const root = parse(
    '<Compression version="1.1"><channelId>0</channelId>' +
      "<isNoTranslateFrame>0</isNoTranslateFrame>" +
      "<mainStream><audio>1</audio><resolutionName>2560*1920</resolutionName>" +
      "<width>2560</width><height>1920</height><encoderType>vbr</encoderType>" +
      "<frame>15</frame><bitRate>3072</bitRate>" +
      "<encoderProfile>high</encoderProfile>" +
      "<gop><cur>2</cur><max>4</max><min>1</min></gop></mainStream>" +
      "<subStream><audio>0</audio><resolutionName>640*480</resolutionName>" +
      "<width>640</width><height>480</height><encoderType>cbr</encoderType>" +
      "<frame>10</frame><bitRate>256</bitRate>" +
      "<encoderProfile>main</encoderProfile>" +
      "<gop><cur>3</cur><max>5</max><min>2</min></gop></subStream>" +
      "<thirdStream><audio>1</audio><resolutionName>1280*960</resolutionName>" +
      "<width>1280</width><height>960</height><encoderType>vbr</encoderType>" +
      "<frame>12</frame><bitRate>1024</bitRate>" +
      "<encoderProfile>baseLine</encoderProfile></thirdStream></Compression>",
  ).root;

  assertEquals(compression.decode(root), {
    channelId: 0,
    isNoTranslateFrame: 0,
    mainStream: {
      audio: 1,
      resolutionName: "2560*1920",
      width: 2560,
      height: 1920,
      encoderType: "vbr",
      frame: 15,
      bitRate: 3072,
      encoderProfile: "high",
      gop: { cur: 2, max: 4, min: 1 },
    },
    subStream: {
      audio: 0,
      resolutionName: "640*480",
      width: 640,
      height: 480,
      encoderType: "cbr",
      frame: 10,
      bitRate: 256,
      encoderProfile: "main",
      gop: { cur: 3, max: 5, min: 2 },
    },
    thirdStream: {
      audio: 1,
      resolutionName: "1280*960",
      width: 1280,
      height: 960,
      encoderType: "vbr",
      frame: 12,
      bitRate: 1024,
      encoderProfile: "baseLine",
    },
  });
});
