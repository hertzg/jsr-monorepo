import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { pushRspInfo } from "./push-rsp-info.ts";

Deno.test("pushRspInfo decodes a cmd 124 reply", () => {
  const root = parse(
    '<PushRspInfo version="1.1"><registerHandle>7</registerHandle>' +
      "<uid>uid-abc123</uid><uidKey>uidkey-abc123</uidKey></PushRspInfo>",
  ).root;

  assertEquals(pushRspInfo.decode(root), {
    registerHandle: 7,
    uid: "uid-abc123",
    uidKey: "uidkey-abc123",
  });
});

Deno.test("pushRspInfo round-trips through encode and decode", () => {
  const value = { registerHandle: -1, uid: "uid-rt", uidKey: "uidkey-rt" };

  assertEquals(
    pushRspInfo.decode(parse(pushRspInfo.encode(value)).root),
    value,
  );
});

Deno.test("pushRspInfo throws when an always-written field is missing", () => {
  const root = parse(
    '<PushRspInfo version="1.1"><registerHandle>7</registerHandle>' +
      "<uid>uid-abc123</uid></PushRspInfo>",
  ).root;

  assertThrows(() => pushRspInfo.decode(root), Error, "<uidKey>");
});
