import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { recordCfg } from "./record-cfg.ts";

Deno.test("recordCfg decodes the cmd 54 reply element with both lists", () => {
  const root = parse(
    '<RecordCfg version="1.1"><channelId>0</channelId><cycle>1</cycle>' +
      "<recordDelayTime>30</recordDelayTime><preRecordTime>5</preRecordTime>" +
      "<packageTime>60</packageTime><cyclelist><item>0</item><item>1</item>" +
      "</cyclelist><timeList><time>15</time><time>45</time></timeList>" +
      "</RecordCfg>",
  ).root;

  assertEquals(recordCfg.decode(root), {
    channelId: 0,
    cycle: 1,
    recordDelayTime: 30,
    preRecordTime: 5,
    packageTime: 60,
    cyclelist: [0, 1],
    timeList: [15, 45],
  });
});

Deno.test("recordCfg decodes a reply without the lists, which the camera leaves out when empty", () => {
  const root = parse(
    '<RecordCfg version="1.1"><channelId>0</channelId><cycle>0</cycle>' +
      "<recordDelayTime>10</recordDelayTime><preRecordTime>2</preRecordTime>" +
      "<packageTime>30</packageTime></RecordCfg>",
  ).root;

  assertEquals(recordCfg.decode(root), {
    channelId: 0,
    cycle: 0,
    recordDelayTime: 10,
    preRecordTime: 2,
    packageTime: 30,
  });
});

Deno.test("recordCfg round-trips every field", () => {
  const value = {
    channelId: 1,
    cycle: 1,
    recordDelayTime: 20,
    preRecordTime: 3,
    packageTime: 90,
    cyclelist: [7],
    timeList: [11, 22, 33],
  };

  assertEquals(recordCfg.decode(parse(recordCfg.encode(value)).root), value);
});
