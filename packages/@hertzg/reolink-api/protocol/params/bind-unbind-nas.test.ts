import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { bindUnbindNas } from "./bind-unbind-nas.ts";

Deno.test("bindUnbindNas decodes what net_bind_unbind_nas_s2x writes", () => {
  const root = parse(
    '<BindUnbindNas version="1.1"><devName>Basement NAS</devName>' +
      "<uid>95270000ABCDEF12</uid></BindUnbindNas>",
  ).root;

  assertEquals(bindUnbindNas.decode(root), {
    devName: "Basement NAS",
    uid: "95270000ABCDEF12",
  });
});

Deno.test("bindUnbindNas round-trips every field", () => {
  const value = {
    userName: "nas-user",
    password: "nas-password",
    devName: "nas-device",
    uid: "nas-uid-0001",
    token: "nas-token-abc",
  };

  assertEquals(
    bindUnbindNas.decode(parse(bindUnbindNas.encode(value)).root),
    value,
  );
});

Deno.test("bindUnbindNas writes the credentials before the device", () => {
  assertEquals(
    bindUnbindNas.encode({ uid: "nas-uid-0002", userName: "nas-user" }),
    '<BindUnbindNas version="1.1"><userName>nas-user</userName>' +
      "<uid>nas-uid-0002</uid></BindUnbindNas>",
  );
});
