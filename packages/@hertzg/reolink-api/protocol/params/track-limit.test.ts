import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { trackLimit } from "./track-limit.ts";

Deno.test("trackLimit decodes the reply the camera writes", () => {
  const root = parse(
    '<trackLimit version="1.1"><channelId>1</channelId><leftLimit>120</leftLimit>' +
      "<leftImageName>left-abc123</leftImageName><rightLimit>2480</rightLimit>" +
      "<rightImageName>right-abc123</rightImageName></trackLimit>",
  ).root;

  assertEquals(trackLimit.decode(root), {
    channelId: 1,
    leftLimit: 120,
    leftImageName: "left-abc123",
    rightLimit: 2480,
    rightImageName: "right-abc123",
  });
});

Deno.test("trackLimit round-trips through encode and decode", () => {
  const value = {
    channelId: 0,
    leftLimit: 35,
    leftImageName: "left-def456",
    rightLimit: 3300,
    rightImageName: "right-def456",
  };

  const xml = trackLimit.encode(value);

  assertEquals(trackLimit.decode(parse(xml).root), value);
});

Deno.test("trackLimit decodes a request that moves only the left limit", () => {
  const root = parse(
    '<trackLimit version="1.1"><channelId>0</channelId><leftLimit>64</leftLimit></trackLimit>',
  ).root;

  assertEquals(trackLimit.decode(root), { channelId: 0, leftLimit: 64 });
});
