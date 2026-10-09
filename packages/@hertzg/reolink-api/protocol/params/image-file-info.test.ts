import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { imageFileInfo } from "./image-file-info.ts";

Deno.test("imageFileInfo decodes the export reply the camera writes", () => {
  const root = parse(
    '<imageFileInfo version="1.1"><fileSize>4096</fileSize></imageFileInfo>',
  ).root;

  assertEquals(imageFileInfo.decode(root), { fileSize: 4096 });
});

Deno.test("imageFileInfo round-trips through encode and decode", () => {
  const value = {
    channelId: 1,
    fileSize: 8192,
    imageName: "image-abc123",
    delete: 0,
  };

  const xml = imageFileInfo.encode(value);

  assertEquals(imageFileInfo.decode(parse(xml).root), value);
});

Deno.test("imageFileInfo decodes a request that deletes an image", () => {
  const root = parse(
    '<imageFileInfo version="1.1"><imageName>image-def456</imageName>' +
      "<delete>1</delete></imageFileInfo>",
  ).root;

  assertEquals(imageFileInfo.decode(root), {
    imageName: "image-def456",
    delete: 1,
  });
});
