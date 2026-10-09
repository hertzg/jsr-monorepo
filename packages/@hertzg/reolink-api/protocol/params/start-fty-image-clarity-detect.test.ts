import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { startFtyImageClarityDetect } from "./start-fty-image-clarity-detect.ts";

Deno.test("startFtyImageClarityDetect decodes every field the parser reads", () => {
  const root = parse(
    '<startFtyImageClarityDetect version="1.1">' +
      "<threshold>60,55,50,45,40</threshold><aeExpTime>33</aeExpTime>" +
      "<aeIsoGain>200</aeIsoGain><awbRgain>410</awbRgain>" +
      "<awbGgain>256</awbGgain><awbBgain>380</awbBgain>" +
      "<desc>lens-a</desc></startFtyImageClarityDetect>",
  ).root;

  assertEquals(startFtyImageClarityDetect.decode(root), {
    threshold: "60,55,50,45,40",
    aeExpTime: 33,
    aeIsoGain: 200,
    awbRgain: 410,
    awbGgain: 256,
    awbBgain: 380,
    desc: "lens-a",
  });
});

Deno.test("startFtyImageClarityDetect keeps the threshold list as text", () => {
  const root = parse(
    '<startFtyImageClarityDetect version="1.1">' +
      "<threshold>70,65</threshold></startFtyImageClarityDetect>",
  ).root;

  assertEquals(startFtyImageClarityDetect.decode(root).threshold, "70,65");
});

Deno.test("startFtyImageClarityDetect decodes an element with no fields", () => {
  const root = parse(
    '<startFtyImageClarityDetect version="1.1"></startFtyImageClarityDetect>',
  ).root;

  assertEquals(startFtyImageClarityDetect.decode(root), {});
});

Deno.test("startFtyImageClarityDetect round-trips through encode and decode", () => {
  const value = {
    threshold: "61,56,51,46,41",
    aeExpTime: 40,
    aeIsoGain: 100,
    awbRgain: 400,
    awbGgain: 250,
    awbBgain: 370,
    desc: "lens-b",
  };

  const xml = startFtyImageClarityDetect.encode(value);

  assertEquals(startFtyImageClarityDetect.decode(parse(xml).root), value);
});
