import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { rfAlarmCfg } from "./rf-alarm-cfg.ts";

Deno.test("rfAlarmCfg decodes the cmd 212 reply", () => {
  const root = parse(
    '<rfAlarmCfg version="1.1"><enable>1</enable><sensiValue>60</sensiValue>' +
      "<reduceFalseAlarm>2</reduceFalseAlarm></rfAlarmCfg>",
  ).root;

  assertEquals(rfAlarmCfg.decode(root), {
    enable: 1,
    sensiValue: 60,
    reduceFalseAlarm: 2,
  });
});

Deno.test("rfAlarmCfg decodes a request with only the sensitivity", () => {
  const root = parse(
    '<rfAlarmCfg version="1.1"><sensiValue>35</sensiValue></rfAlarmCfg>',
  ).root;

  assertEquals(rfAlarmCfg.decode(root), { sensiValue: 35 });
});

Deno.test("rfAlarmCfg round-trips through encode and decode", () => {
  const value = { enable: 0, sensiValue: 90, reduceFalseAlarm: 1 };

  const xml = rfAlarmCfg.encode(value);

  assertEquals(rfAlarmCfg.decode(parse(xml).root), value);
});
