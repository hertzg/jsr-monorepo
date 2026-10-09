import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { streamInfoList } from "./stream-info-list.ts";

Deno.test("streamInfoList decodes a cmd 146 reply with both streams", () => {
  const root = parse(
    '<StreamInfoList version="1.1"><StreamInfo><channelBits>1</channelBits>' +
      "<encodeTable><type>mainStream</type>" +
      "<resolution><width>3840</width><height>2160</height></resolution>" +
      "<defaultFramerate>25</defaultFramerate><defaultBitrate>6144</defaultBitrate>" +
      "<framerateTable>25,22,20,18,16</framerateTable>" +
      "<bitrateTable>4096,5120,6144</bitrateTable><defaultGop>2</defaultGop>" +
      "</encodeTable>" +
      "<encodeTable><type>subStream</type>" +
      "<resolution><width>640</width><height>360</height></resolution>" +
      "<defaultFramerate>15</defaultFramerate><defaultBitrate>256</defaultBitrate>" +
      "<framerateTable>15,10,7</framerateTable>" +
      "<bitrateTable>64,128,256</bitrateTable><defaultGop>4</defaultGop>" +
      "</encodeTable></StreamInfo></StreamInfoList>",
  ).root;

  assertEquals(streamInfoList.decode(root), {
    StreamInfo: [{
      channelBits: 1,
      encodeTable: [
        {
          type: "mainStream",
          resolution: { width: 3840, height: 2160 },
          defaultFramerate: 25,
          defaultBitrate: 6144,
          framerateTable: "25,22,20,18,16",
          bitrateTable: "4096,5120,6144",
          defaultGop: 2,
        },
        {
          type: "subStream",
          resolution: { width: 640, height: 360 },
          defaultFramerate: 15,
          defaultBitrate: 256,
          framerateTable: "15,10,7",
          bitrateTable: "64,128,256",
          defaultGop: 4,
        },
      ],
    }],
  });
});

Deno.test("streamInfoList decodes a table without defaultGop", () => {
  const root = parse(
    '<StreamInfoList version="1.1"><StreamInfo><channelBits>2</channelBits>' +
      "<encodeTable><type>subStream</type>" +
      "<resolution><width>896</width><height>512</height></resolution>" +
      "<defaultFramerate>10</defaultFramerate><defaultBitrate>512</defaultBitrate>" +
      "<framerateTable>10,8</framerateTable><bitrateTable>256,512</bitrateTable>" +
      "</encodeTable></StreamInfo></StreamInfoList>",
  ).root;

  assertEquals(streamInfoList.decode(root).StreamInfo[0].encodeTable[0], {
    type: "subStream",
    resolution: { width: 896, height: 512 },
    defaultFramerate: 10,
    defaultBitrate: 512,
    framerateTable: "10,8",
    bitrateTable: "256,512",
  });
});

Deno.test("streamInfoList rejects an unknown stream type", () => {
  const root = parse(
    '<StreamInfoList version="1.1"><StreamInfo><channelBits>1</channelBits>' +
      "<encodeTable><type>thirdStream</type>" +
      "<resolution><width>1</width><height>1</height></resolution>" +
      "<defaultFramerate>1</defaultFramerate><defaultBitrate>1</defaultBitrate>" +
      "<framerateTable>1</framerateTable><bitrateTable>1</bitrateTable>" +
      "</encodeTable></StreamInfo></StreamInfoList>",
  ).root;

  assertThrows(() => streamInfoList.decode(root), Error, "<type>");
});

Deno.test("streamInfoList round-trips through encode and decode", () => {
  const value = {
    StreamInfo: [{
      channelBits: 3,
      encodeTable: [{
        type: "externStream" as const,
        resolution: { width: 1280, height: 720 },
        defaultFramerate: 20,
        defaultBitrate: 1024,
        framerateTable: "20,15,10",
        bitrateTable: "512,768,1024",
        defaultGop: 1,
      }],
    }],
  };

  const xml = streamInfoList.encode(value);

  assertEquals(streamInfoList.decode(parse(xml).root), value);
});
