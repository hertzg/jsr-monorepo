import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { pushClientId } from "./push-client-id.ts";

Deno.test("pushClientId decodes the cmd 522 reply the firmware writes", () => {
  const root = parse(
    '<PushClientID version="1.1"><clientID>client-42</clientID></PushClientID>',
  ).root;

  assertEquals(pushClientId.decode(root), { clientID: "client-42" });
});

Deno.test("pushClientId decodes a cmd 522 request", () => {
  const root = parse(
    "<PushClientID><clientType>ios</clientType>" +
      "<pushToken>token-def456</pushToken></PushClientID>",
  ).root;

  assertEquals(pushClientId.decode(root), {
    clientType: "ios",
    pushToken: "token-def456",
  });
});

Deno.test("pushClientId round-trips through encode and decode", () => {
  const value = {
    clientType: "type-android",
    pushToken: "token-ghi789",
    clientID: "client-99",
  };

  assertEquals(
    pushClientId.decode(parse(pushClientId.encode(value)).root),
    value,
  );
});
