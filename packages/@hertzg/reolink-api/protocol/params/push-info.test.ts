import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { pushInfo } from "./push-info.ts";

Deno.test("pushInfo decodes a full registration", () => {
  const root = parse(
    '<PushInfo version="1.1"><token>fcm-token-123</token>' +
      "<phoneType>android</phoneType><clientID>phone-1</clientID></PushInfo>",
  ).root;

  assertEquals(pushInfo.decode(root), {
    token: "fcm-token-123",
    phoneType: "android",
    clientID: "phone-1",
  });
});

Deno.test("pushInfo decodes an element with only a client", () => {
  const root = parse(
    '<PushInfo version="1.1"><clientID>phone-2</clientID></PushInfo>',
  ).root;

  assertEquals(pushInfo.decode(root), { clientID: "phone-2" });
});

Deno.test("pushInfo round-trips through encode and decode", () => {
  const value = {
    token: "apns-token-456",
    phoneType: "ios",
    clientID: "tablet-9",
  };

  const xml = pushInfo.encode(value);

  assertEquals(pushInfo.decode(parse(xml).root), value);
});
