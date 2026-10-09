import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { ftpTestResult } from "./ftp-test-result.ts";

Deno.test("ftpTestResult decodes a server reply", () => {
  const root = parse(
    '<FtpTestResult version="1.1"><rspCode>230</rspCode>' +
      "<detail>Login successful.</detail></FtpTestResult>",
  ).root;

  assertEquals(ftpTestResult.decode(root), {
    rspCode: 230,
    detail: "Login successful.",
  });
});

Deno.test("ftpTestResult decodes an empty result", () => {
  const root = parse('<FtpTestResult version="1.1"></FtpTestResult>').root;

  assertEquals(ftpTestResult.decode(root), {});
});

Deno.test("ftpTestResult round-trips through encode and decode", () => {
  const value = { rspCode: 530, detail: "Login incorrect." };

  assertEquals(
    ftpTestResult.decode(parse(ftpTestResult.encode(value)).root),
    value,
  );
});
