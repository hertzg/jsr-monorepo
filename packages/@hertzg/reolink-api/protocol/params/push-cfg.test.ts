import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { pushCfg } from "./push-cfg.ts";

Deno.test("pushCfg decodes the reply the camera writes", () => {
  const root = parse('<PushCfg version="1.1"><interval>45</interval></PushCfg>')
    .root;

  assertEquals(pushCfg.decode(root), { interval: 45 });
});

Deno.test("pushCfg round-trips through encode and decode", () => {
  const value = { interval: 120 };

  const xml = pushCfg.encode(value);

  assertEquals(pushCfg.decode(parse(xml).root), value);
});

Deno.test("pushCfg decodes an empty element", () => {
  const root = parse('<PushCfg version="1.1"></PushCfg>').root;

  assertEquals(pushCfg.decode(root), {});
});

Deno.test("pushCfg reads the Video Doorbell PoE's notification switches", () => {
  const root = parse(
    '<PushCfg version="1.1"><interval>30</interval>' +
      "<richNotificationEnable>1</richNotificationEnable>" +
      "<consentAgreement>0</consentAgreement></PushCfg>",
  ).root;

  assertEquals(pushCfg.decode(root), {
    interval: 30,
    richNotificationEnable: 1,
    consentAgreement: 0,
  });
});
