import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { pushCreateListener } from "./push-create-listener.ts";

Deno.test("pushCreateListener decodes a cmd 524 request", () => {
  const root = parse(
    '<PushCreateListener version="1.1"><clientID>client-31</clientID>' +
      "<channelId>2</channelId></PushCreateListener>",
  ).root;

  assertEquals(pushCreateListener.decode(root), {
    clientID: "client-31",
    channelId: "2",
  });
});

Deno.test("pushCreateListener round-trips through encode and decode", () => {
  const value = { clientID: "client-64", channelId: "channel-1" };

  assertEquals(
    pushCreateListener.decode(parse(pushCreateListener.encode(value)).root),
    value,
  );
});

Deno.test("pushCreateListener encodes only the fields given", () => {
  assertEquals(
    pushCreateListener.encode({ clientID: "client-5" }),
    '<PushCreateListener version="1.1"><clientID>client-5</clientID></PushCreateListener>',
  );
});
