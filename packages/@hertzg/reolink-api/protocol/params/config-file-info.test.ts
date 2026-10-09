import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { configFileInfo } from "./config-file-info.ts";

Deno.test("configFileInfo decodes every field the firmware reads", () => {
  const root = parse(
    '<ConfigFileInfo version="1.1"><fileName>cfg-abc123.bin</fileName>' +
      "<fileSize>4294967295</fileSize><curSize>1024</curSize>" +
      "<updateParameter>1</updateParameter><usedForFactory>0</usedForFactory>" +
      "</ConfigFileInfo>",
  ).root;

  assertEquals(configFileInfo.decode(root), {
    fileName: "cfg-abc123.bin",
    fileSize: 4294967295,
    curSize: 1024,
    updateParameter: 1,
    usedForFactory: 0,
  });
});

Deno.test("configFileInfo round-trips through encode and decode", () => {
  const value = {
    fileName: "cfg-roundtrip.bin",
    fileSize: 8192,
    curSize: 4096,
    updateParameter: 0,
    usedForFactory: 1,
  };

  assertEquals(
    configFileInfo.decode(parse(configFileInfo.encode(value)).root),
    value,
  );
});

Deno.test("configFileInfo decodes a request with only a file name", () => {
  const root = parse(
    '<ConfigFileInfo version="1.1"><fileName>only.bin</fileName></ConfigFileInfo>',
  ).root;

  assertEquals(configFileInfo.decode(root), { fileName: "only.bin" });
});
