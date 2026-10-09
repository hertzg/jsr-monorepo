import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { certificateInfo } from "./certificate-info.ts";

Deno.test("certificateInfo decodes the reply the camera writes", () => {
  const root = parse(
    '<certificateInfo version="1.1"><enable>1</enable>' +
      "<certName>cert-abc123</certName><keyName>key-abc123</keyName>" +
      "</certificateInfo>",
  ).root;

  assertEquals(certificateInfo.decode(root), {
    enable: 1,
    certName: "cert-abc123",
    keyName: "key-abc123",
  });
});

Deno.test("certificateInfo round-trips an import through encode and decode", () => {
  const value = {
    certName: "cert-def456",
    keyName: "key-def456",
    key: "keydata-def456",
    cert: "certdata-def456",
    option: "import" as const,
  };

  const xml = certificateInfo.encode(value);

  assertEquals(certificateInfo.decode(parse(xml).root), value);
});

Deno.test("certificateInfo decodes a request that clears the certificate", () => {
  const root = parse(
    '<certificateInfo version="1.1"><option>clear</option></certificateInfo>',
  ).root;

  assertEquals(certificateInfo.decode(root), { option: "clear" });
});

Deno.test("certificateInfo rejects an option the firmware does not map", () => {
  const root = parse(
    '<certificateInfo version="1.1"><option>export</option></certificateInfo>',
  ).root;

  assertThrows(() => certificateInfo.decode(root), Error, "option");
});
