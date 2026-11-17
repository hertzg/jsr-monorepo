import { test } from "node:test";
import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { ftpTestResult } from "./ftp-test-result.ts";

test("ftpTestResult decodes a server reply", () => {
  const root = parse(
    '<FtpTestResult version="1.1"><rspCode>230</rspCode>' +
      "<detail>Login successful.</detail></FtpTestResult>",
  ).root;

  assertEquals(ftpTestResult.decode(root), {
    rspCode: 230,
    detail: "Login successful.",
  });
});

test("ftpTestResult decodes an empty result", () => {
  const root = parse('<FtpTestResult version="1.1"></FtpTestResult>').root;

  assertEquals(ftpTestResult.decode(root), {});
});

test("ftpTestResult round-trips through encode and decode", () => {
  const value = { rspCode: 530, detail: "Login incorrect." };

  assertEquals(
    ftpTestResult.decode(parse(ftpTestResult.encode(value)).root),
    value,
  );
});
