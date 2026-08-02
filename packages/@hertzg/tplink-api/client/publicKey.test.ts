import { assertEquals } from "@std/assert";
import { _extractVariables, parsePublicKeyText } from "./publicKey.ts";

Deno.test("cgi/getParm samples where all 3 required fields are present", () => {
  const nnLine = `var nn="${"A".repeat(128)}";`;
  const eeLine = 'var ee="010100";';
  const seqLine = 'var seq="111111111";';
  const samples = [
    ["var userSetting=1;", eeLine, nnLine, seqLine, "$.ret=0;"],
    [eeLine, nnLine, seqLine, "$.ret=0;"],
    [eeLine, "var userSetting=1;", seqLine, nnLine, "$.ret=0;"],
    [eeLine, seqLine, nnLine],
    [eeLine, nnLine, "", seqLine, "$.ret=0;"],
    [eeLine, "", nnLine, "", seqLine, "", "", "", "", "", "$.ret=0;"],
    ["", eeLine, "", nnLine, "", seqLine, "", "", "", "", "", "$.ret=0;"],
    ["", "", nnLine, "", eeLine, seqLine, "", "", "", "", "", "$.ret=0;"],
    [nnLine, eeLine, seqLine],
    [seqLine, nnLine, eeLine],
    [eeLine, nnLine, seqLine],
    [eeLine, seqLine, nnLine],
  ];

  const expected = {
    exponent: "010100",
    modulus:
      "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    sequence: "111111111",
  };

  for (const sample of samples) {
    assertEquals(_extractVariables(sample.join("\n")), expected);
  }
});

Deno.test("parsePublicKeyText decodes hex parameters", () => {
  const key = parsePublicKeyText(
    ['var ee="010001";', 'var nn="00ff10";', 'var seq="742334261";'].join("\n"),
  );

  assertEquals(key.exponent, Uint8Array.from([0x01, 0x00, 0x01]));
  assertEquals(key.modulus, Uint8Array.from([0x00, 0xff, 0x10]));
  assertEquals(key.sequence, 742334261);
});
