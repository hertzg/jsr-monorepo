import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { ptzGuard } from "./ptz-guard.ts";

Deno.test("ptzGuard decodes the reply the camera writes", () => {
  const root = parse(
    '<PtzGuard version="1.1"><channelId>2</channelId><timeout>45</timeout>' +
      "<benable>1</benable><bvalid>0</bvalid>" +
      "<imageName>image-abc123</imageName></PtzGuard>",
  ).root;

  assertEquals(ptzGuard.decode(root), {
    channelId: 2,
    timeout: 45,
    benable: 1,
    bvalid: 0,
    imageName: "image-abc123",
  });
});

Deno.test("ptzGuard round-trips through encode and decode", () => {
  const value = {
    channelId: 1,
    timeout: 300,
    benable: 1,
    bvalid: 1,
    imageName: "image-def456",
    needSetPos: 1,
    command: "command-def456",
  };

  const xml = ptzGuard.encode(value);

  assertEquals(ptzGuard.decode(parse(xml).root), value);
});

Deno.test("ptzGuard decodes a request that only switches the guard off", () => {
  const root = parse(
    '<PtzGuard version="1.1"><channelId>0</channelId><benable>0</benable></PtzGuard>',
  ).root;

  assertEquals(ptzGuard.decode(root), { channelId: 0, benable: 0 });
});
