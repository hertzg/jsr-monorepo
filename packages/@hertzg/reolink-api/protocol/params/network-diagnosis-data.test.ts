import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { networkDiagnosisData } from "./network-diagnosis-data.ts";

Deno.test("networkDiagnosisData decodes the reply the camera writes", () => {
  const root = parse(
    '<NetworkDiagnosisData version="1.1"><fileName>file-abc123</fileName>' +
      "<size>4096</size></NetworkDiagnosisData>",
  ).root;

  assertEquals(networkDiagnosisData.decode(root), {
    fileName: "file-abc123",
    size: 4096,
  });
});

Deno.test("networkDiagnosisData round-trips through encode and decode", () => {
  const value = { channelId: 2, fileName: "file-def456", size: 8192 };

  const xml = networkDiagnosisData.encode(value);

  assertEquals(networkDiagnosisData.decode(parse(xml).root), value);
});

Deno.test("networkDiagnosisData decodes a request naming only the channel", () => {
  const root = parse(
    '<NetworkDiagnosisData version="1.1"><channelId>1</channelId></NetworkDiagnosisData>',
  ).root;

  assertEquals(networkDiagnosisData.decode(root), { channelId: 1 });
});
