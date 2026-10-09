import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { cropSnap } from "./crop-snap.ts";

Deno.test("cropSnap decodes a request nets_param_crop_snap_x2s reads", () => {
  const root = parse(
    '<CropSnap version="1.1"><channelId>1</channelId><width>1920</width>' +
      "<heigth>1080</heigth></CropSnap>",
  ).root;

  assertEquals(cropSnap.decode(root), {
    channelId: 1,
    width: 1920,
    heigth: 1080,
  });
});

Deno.test("cropSnap round-trips a full value", () => {
  const value = { channelId: 0, width: 800, heigth: 600 };

  assertEquals(cropSnap.decode(parse(cropSnap.encode(value)).root), value);
});

Deno.test("cropSnap writes the height as heigth, the spelling the firmware reads", () => {
  assertEquals(
    cropSnap.encode({ heigth: 480 }),
    '<CropSnap version="1.1"><heigth>480</heigth></CropSnap>',
  );
});
