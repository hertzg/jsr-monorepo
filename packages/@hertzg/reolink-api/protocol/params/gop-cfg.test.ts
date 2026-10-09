import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { gopCfg } from "./gop-cfg.ts";

Deno.test("gopCfg decodes every field nets_param_gop_cfg_x2s reads", () => {
  const root = parse(
    '<GopCfg version="1.1"><channel>3</channel><streamType>1</streamType>' +
      "<gopTime>2</gopTime></GopCfg>",
  ).root;

  assertEquals(gopCfg.decode(root), { channel: 3, streamType: 1, gopTime: 2 });
});

Deno.test("gopCfg round-trips every field", () => {
  const value = { channel: 1, streamType: 2, gopTime: 8 };

  assertEquals(gopCfg.decode(parse(gopCfg.encode(value)).root), value);
});

Deno.test("gopCfg writes only the fields that are set", () => {
  assertEquals(
    gopCfg.encode({ gopTime: 5 }),
    '<GopCfg version="1.1"><gopTime>5</gopTime></GopCfg>',
  );
});
