import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { cloudUploadCfg } from "./cloud-upload-cfg.ts";

Deno.test("cloudUploadCfg decodes what nets_cloud_upload_cfg_s2x writes", () => {
  const root = parse(
    '<CloudUploadCfg version="1.1"><enable>1</enable><version>7</version>' +
      "<streamOpList>1,1,0</streamOpList><streamCfgList>0,1,0</streamCfgList>" +
      "</CloudUploadCfg>",
  ).root;

  assertEquals(cloudUploadCfg.decode(root), {
    enable: 1,
    version: 7,
    streamOpList: "1,1,0",
    streamCfgList: "0,1,0",
  });
});

Deno.test("cloudUploadCfg round-trips every field", () => {
  const value = {
    enable: 0,
    version: 3,
    streamOpList: "0,0,1",
    streamCfgList: "1,0,0",
  };

  assertEquals(
    cloudUploadCfg.decode(parse(cloudUploadCfg.encode(value)).root),
    value,
  );
});

Deno.test("cloudUploadCfg reads the child <version>, not the attribute", () => {
  const root = parse(
    '<CloudUploadCfg version="1.1"><version>9</version></CloudUploadCfg>',
  ).root;

  assertEquals(cloudUploadCfg.decode(root).version, 9);
});

Deno.test("cloudUploadCfg leaves out fields that are not set", () => {
  assertEquals(
    cloudUploadCfg.encode({ enable: 1 }),
    '<CloudUploadCfg version="1.1"><enable>1</enable></CloudUploadCfg>',
  );
});
