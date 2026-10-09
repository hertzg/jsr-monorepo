import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { loginErrInfo } from "./login-err-info.ts";

Deno.test("loginErrInfo decodes a refusal with both counters", () => {
  const root = parse(
    '<LoginErrInfo version="1.1"><remainTimes>3</remainTimes>' +
      "<unlockTime>600</unlockTime></LoginErrInfo>",
  ).root;

  assertEquals(loginErrInfo.decode(root), { remainTimes: 3, unlockTime: 600 });
});

Deno.test("loginErrInfo decodes an empty refusal", () => {
  const root = parse('<LoginErrInfo version="1.1"></LoginErrInfo>').root;

  assertEquals(loginErrInfo.decode(root), {});
});

Deno.test("loginErrInfo round-trips through encode and decode", () => {
  const value = { remainTimes: 1, unlockTime: 120 };

  assertEquals(
    loginErrInfo.decode(parse(loginErrInfo.encode(value)).root),
    value,
  );
});
