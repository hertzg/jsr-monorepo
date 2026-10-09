import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { loginUser } from "./login-user.ts";

Deno.test("loginUser decodes a hashed login", () => {
  const root = parse(
    '<LoginUser version="1.1"><userName>user-hash-abc123</userName>' +
      "<password>password-hash-def456</password><userVer>1</userVer>" +
      "</LoginUser>",
  ).root;

  assertEquals(loginUser.decode(root), {
    userName: "user-hash-abc123",
    password: "password-hash-def456",
    userVer: 1,
  });
});

Deno.test("loginUser decodes token scopes", () => {
  const root = parse(
    "<LoginUser><authToken>token-abc</authToken><scopes>" +
      "<item><channelId>-1</channelId><privileges>privileges-all</privileges></item>" +
      "<item><channelId>2</channelId></item>" +
      "</scopes></LoginUser>",
  ).root;

  assertEquals(loginUser.decode(root).scopes, [
    { channelId: -1, privileges: "privileges-all" },
    { channelId: 2 },
  ]);
});

Deno.test("loginUser round-trips through encode and decode", () => {
  const value = {
    userName: "user-hash-ghi789",
    password: "password-hash-jkl012",
    userVer: 1,
    handleSpecial: 2,
    authSignature: "signature-mno345",
    authToken: "token-pqr678",
    authUser: "auth-user-stu901",
    admin: 1,
    scopes: [{ channelId: 3, privileges: "privileges-vwx234" }],
  };

  assertEquals(loginUser.decode(parse(loginUser.encode(value)).root), value);
});

Deno.test("loginUser throws on a scope item without channelId", () => {
  const root = parse(
    "<LoginUser><scopes><item><privileges>p</privileges></item></scopes></LoginUser>",
  ).root;

  assertThrows(() => loginUser.decode(root), Error, "<channelId>");
});
