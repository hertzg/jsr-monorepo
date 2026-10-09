import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { snap } from "./snap.ts";

Deno.test("snap decodes the reply the cmd 109 handler writes", () => {
  const root = parse(
    '<Snap version="1.1"><channelId>2</channelId><fileName>snap-abc123.jpg</fileName>' +
      "<time>1700000000</time><pictureSize>48213</pictureSize></Snap>",
  ).root;

  assertEquals(snap.decode(root), {
    channelId: 2,
    fileName: "snap-abc123.jpg",
    time: 1700000000,
    pictureSize: 48213,
  });
});

Deno.test("snap round-trips through encode and decode", () => {
  const value = {
    channelId: 1,
    fileName: "snap-roundtrip.jpg",
    time: 5,
    pictureSize: 1024,
    snapPolicy: 3,
  };

  assertEquals(snap.decode(parse(snap.encode(value)).root), value);
});

Deno.test("snap decodes a reply that carries only the picture size", () => {
  const root = parse("<Snap><pictureSize>6</pictureSize></Snap>").root;

  assertEquals(snap.decode(root), { pictureSize: 6 });
});
