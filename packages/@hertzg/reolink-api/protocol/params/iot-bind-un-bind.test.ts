import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { iotBindUnBind } from "./iot-bind-un-bind.ts";

Deno.test("iotBindUnBind decodes the reply the camera writes", () => {
  const root = parse(
    '<IOTBindUnBind version="1.1"><name>name-abc123</name>' +
      "<uid>uid-abc123</uid></IOTBindUnBind>",
  ).root;

  assertEquals(iotBindUnBind.decode(root), {
    name: "name-abc123",
    uid: "uid-abc123",
  });
});

Deno.test("iotBindUnBind round-trips through encode and decode", () => {
  const value = {
    name: "name-def456",
    uid: "uid-def456",
    userName: "user-def456",
    password: "password-def456",
    token: "token-def456",
    deviceType: 4,
  };

  const xml = iotBindUnBind.encode(value);

  assertEquals(iotBindUnBind.decode(parse(xml).root), value);
});

Deno.test("iotBindUnBind decodes an unbind request naming only the uid", () => {
  const root = parse(
    '<IOTBindUnBind version="1.1"><uid>uid-ghi789</uid></IOTBindUnBind>',
  ).root;

  assertEquals(iotBindUnBind.decode(root), { uid: "uid-ghi789" });
});
