import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { aiyuvCfg } from "./aiyuv-cfg.ts";

Deno.test("aiyuvCfg decodes a cmd 720 request", () => {
  const root = parse(
    '<AIYUVCfg version="1.1"><needTLV>0</needTLV><gapms>500</gapms>' +
      "<resoWidth>896</resoWidth><resoHeight>512</resoHeight>" +
      "<algorithm>2</algorithm></AIYUVCfg>",
  ).root;

  assertEquals(aiyuvCfg.decode(root), {
    needTLV: 0,
    gapms: 500,
    resoWidth: 896,
    resoHeight: 512,
    algorithm: 2,
  });
});

Deno.test("aiyuvCfg round-trips through encode and decode", () => {
  const value = {
    needTLV: 1,
    gapms: 40,
    resoWidth: 1280,
    resoHeight: 720,
    algorithm: 3,
  };

  assertEquals(aiyuvCfg.decode(parse(aiyuvCfg.encode(value)).root), value);
});

Deno.test("aiyuvCfg encodes only the fields given", () => {
  assertEquals(
    aiyuvCfg.encode({ gapms: 250 }),
    '<AIYUVCfg version="1.1"><gapms>250</gapms></AIYUVCfg>',
  );
});
