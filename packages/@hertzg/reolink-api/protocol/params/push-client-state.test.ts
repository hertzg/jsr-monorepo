import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { pushClientState } from "./push-client-state.ts";

Deno.test("pushClientState decodes the cmd 526 reply the firmware writes", () => {
  const root = parse(
    '<PushClientState version="1.1"><clientID>client-12</clientID>' +
      "<channelIdList><channelId>0</channelId><channelId>3</channelId>" +
      "</channelIdList></PushClientState>",
  ).root;

  assertEquals(pushClientState.decode(root), {
    clientID: "client-12",
    channelIdList: ["0", "3"],
  });
});

Deno.test("pushClientState decodes an empty channel list", () => {
  const root = parse(
    '<PushClientState version="1.1"><clientID>client-13</clientID>' +
      "<channelIdList></channelIdList></PushClientState>",
  ).root;

  assertEquals(pushClientState.decode(root).channelIdList, []);
});

Deno.test("pushClientState round-trips through encode and decode", () => {
  const value = {
    clientID: "client-14",
    channelIdList: ["channel-0", "channel-1"],
  };

  assertEquals(
    pushClientState.decode(parse(pushClientState.encode(value)).root),
    value,
  );
});
