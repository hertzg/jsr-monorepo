import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { nasUploadCfg } from "./nas-upload-cfg.ts";

Deno.test("nasUploadCfg decodes what the cmd 304 handler writes", () => {
  const root = parse(
    '<NasUploadCfg version="1.1"><enable>1</enable>' +
      "<streamAbility>3</streamAbility><streamConfig>2</streamConfig>" +
      "</NasUploadCfg>",
  ).root;

  assertEquals(nasUploadCfg.decode(root), {
    enable: 1,
    streamAbility: 3,
    streamConfig: 2,
  });
});

Deno.test("nasUploadCfg round-trips every field", () => {
  const value = { enable: 0, streamAbility: 7, streamConfig: 4 };

  assertEquals(
    nasUploadCfg.decode(parse(nasUploadCfg.encode(value)).root),
    value,
  );
});

Deno.test("nasUploadCfg writes only the fields that are set", () => {
  assertEquals(
    nasUploadCfg.encode({ streamConfig: 1 }),
    '<NasUploadCfg version="1.1"><streamConfig>1</streamConfig></NasUploadCfg>',
  );
});
