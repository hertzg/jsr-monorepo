import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { crop } from "./crop.ts";

Deno.test("crop decodes the reply the cmd 228 handler writes", () => {
  const root = parse(
    '<Crop version="1.1"><channelId>0</channelId><topLeftX>100</topLeftX>' +
      "<topLeftY>200</topLeftY><cropWidth>1280</cropWidth>" +
      "<cropHeight>720</cropHeight><mainWidth>3840</mainWidth>" +
      "<mainHeight>2160</mainHeight><subHeight>360</subHeight>" +
      "<subWidth>640</subWidth><version>2</version></Crop>",
  ).root;

  assertEquals(crop.decode(root), {
    channelId: 0,
    topLeftX: 100,
    topLeftY: 200,
    cropWidth: 1280,
    cropHeight: 720,
    mainWidth: 3840,
    mainHeight: 2160,
    subHeight: 360,
    subWidth: 640,
    version: 2,
  });
});

Deno.test("crop round-trips a full value", () => {
  const value = {
    channelId: 1,
    topLeftX: 11,
    topLeftY: 22,
    cropWidth: 33,
    cropHeight: 44,
    mainWidth: 55,
    mainHeight: 66,
    subHeight: 77,
    subWidth: 88,
    version: 99,
  };

  assertEquals(crop.decode(parse(crop.encode(value)).root), value);
});

Deno.test("crop writes subHeight before subWidth, as the firmware does", () => {
  assertEquals(
    crop.encode({ subWidth: 640, subHeight: 360 }),
    '<Crop version="1.1"><subHeight>360</subHeight><subWidth>640</subWidth></Crop>',
  );
});

Deno.test("crop decodes a set request without the written-only fields", () => {
  const root = parse(
    '<Crop version="1.1"><channelId>0</channelId><topLeftX>0</topLeftX>' +
      "<topLeftY>0</topLeftY><cropWidth>1920</cropWidth>" +
      "<cropHeight>1080</cropHeight><mainWidth>3840</mainWidth>" +
      "<mainHeight>2160</mainHeight></Crop>",
  ).root;

  assertEquals(crop.decode(root), {
    channelId: 0,
    topLeftX: 0,
    topLeftY: 0,
    cropWidth: 1920,
    cropHeight: 1080,
    mainWidth: 3840,
    mainHeight: 2160,
  });
});
