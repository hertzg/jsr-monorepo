import { assertEquals } from "@std/assert";
import {
  evaluateExpression,
  extractAllConstants,
  extractConstants,
} from "./constant-extractor.ts";

// --- Expression evaluator ---

Deno.test("evaluateExpression handles simple integers", () => {
  assertEquals(evaluateExpression("42"), 42);
  assertEquals(evaluateExpression("0"), 0);
  assertEquals(evaluateExpression("100001"), 100001);
});

Deno.test("evaluateExpression handles hex literals", () => {
  assertEquals(evaluateExpression("0x1F"), 31);
  assertEquals(evaluateExpression("0xFF"), 255);
  assertEquals(evaluateExpression("0x0"), 0);
});

Deno.test("evaluateExpression handles floating-point literals", () => {
  assertEquals(evaluateExpression("1.6"), 1.6);
  assertEquals(evaluateExpression("1234567.89"), 1234567.89);
});

Deno.test("evaluateExpression handles bit shifts", () => {
  assertEquals(evaluateExpression("(1<<0)"), 1);
  assertEquals(evaluateExpression("(1<<1)"), 2);
  assertEquals(evaluateExpression("(1<<3)"), 8);
  assertEquals(evaluateExpression("(1<<10)"), 1024);
  assertEquals(evaluateExpression("1 << 4"), 16);
  assertEquals(evaluateExpression("(1<< 1)"), 2);
  assertEquals(evaluateExpression("(1<< 11)"), 2048);
});

Deno.test("evaluateExpression handles bitwise OR", () => {
  assertEquals(evaluateExpression("(1<<1) | (1<<3)"), 10);
  assertEquals(evaluateExpression("1 | 2 | 4"), 7);
});

Deno.test("evaluateExpression handles arithmetic", () => {
  assertEquals(evaluateExpression("1 + 2"), 3);
  assertEquals(evaluateExpression("(5*10000) + (10*100) + 0"), 51000);
});

Deno.test("evaluateExpression handles parenthesized expressions", () => {
  assertEquals(evaluateExpression("(42)"), 42);
  assertEquals(evaluateExpression("((1<<3))"), 8);
});

Deno.test("evaluateExpression handles negative numbers", () => {
  assertEquals(evaluateExpression("-1"), -1);
});

// --- #define extraction ---

Deno.test("extractConstants extracts simple numeric defines", () => {
  const source = [
    "#define TXN_MAX_SPLIT 62",
    "#define OLDPAYMODE_INTXFER 5",
  ].join("\n");
  const result = extractConstants(source, "test.h");
  assertEquals(result.defines.length, 2);
  assertEquals(result.defines[0], {
    name: "TXN_MAX_SPLIT",
    rawValue: "62",
    value: 62,
  });
  assertEquals(result.defines[1], {
    name: "OLDPAYMODE_INTXFER",
    rawValue: "5",
    value: 5,
  });
});

Deno.test("extractConstants extracts bit-shift defines", () => {
  const source = [
    "#define OF_INCOME\t(1<< 1)",
    "#define OF_INTXFER\t(1<< 3)",
    "#define OF_SPLIT\t(1<< 8)",
  ].join("\n");
  const result = extractConstants(source, "test.h");
  assertEquals(result.defines.length, 3);
  assertEquals(result.defines[0], {
    name: "OF_INCOME",
    rawValue: "(1<< 1)",
    value: 2,
  });
  assertEquals(result.defines[1], {
    name: "OF_INTXFER",
    rawValue: "(1<< 3)",
    value: 8,
  });
  assertEquals(result.defines[2], {
    name: "OF_SPLIT",
    rawValue: "(1<< 8)",
    value: 256,
  });
});

Deno.test("extractConstants extracts string defines", () => {
  const source = '#define HB_VERSION\t\t"5.10"';
  const result = extractConstants(source, "test.h");
  assertEquals(result.defines.length, 1);
  assertEquals(result.defines[0], {
    name: "HB_VERSION",
    rawValue: '"5.10"',
    value: "5.10",
  });
});

Deno.test("extractConstants extracts floating-point defines", () => {
  const source = "#define FILE_VERSION\t\t1.6";
  const result = extractConstants(source, "test.h");
  assertEquals(result.defines.length, 1);
  assertEquals(result.defines[0], {
    name: "FILE_VERSION",
    rawValue: "1.6",
    value: 1.6,
  });
});

Deno.test("extractConstants strips inline comments from defines", () => {
  const source = '#define AF_CLOSED\t\t(1<<1)\n#define AF_NOSUMMARY\t(1<<4)';
  const result = extractConstants(source, "test.h");
  assertEquals(result.defines[0].value, 2);
  assertEquals(result.defines[1].value, 16);
});

Deno.test("extractConstants skips commented-out lines", () => {
  const source = [
    '//FREE (1<<0)',
    '//#define UNUSED 42',
    '#define ACTIVE 1',
  ].join("\n");
  const result = extractConstants(source, "test.h");
  assertEquals(result.defines.length, 1);
  assertEquals(result.defines[0].name, "ACTIVE");
});

Deno.test("extractConstants skips include guards", () => {
  const source = [
    "#ifndef __HB_TEST_H__",
    "#define __HB_TEST_H__",
    "#define REAL_VALUE 42",
    "#endif",
  ].join("\n");
  const result = extractConstants(source, "test.h");
  assertEquals(result.defines.length, 1);
  assertEquals(result.defines[0].name, "REAL_VALUE");
});

Deno.test("extractConstants handles define with inline C comment", () => {
  const source = "#define AF_OLDBUDGET\t(1<<0)\t//deprecated";
  const result = extractConstants(source, "test.h");
  assertEquals(result.defines.length, 1);
  assertEquals(result.defines[0].value, 1);
});

// --- Enum extraction ---

Deno.test("extractConstants extracts simple sequential enum", () => {
  const source = "enum {\n\tA,\n\tB,\n\tC\n};";
  const result = extractConstants(source, "test.h");
  assertEquals(result.enums.length, 1);
  assertEquals(result.enums[0].name, null);
  assertEquals(result.enums[0].variants, [
    { name: "A", value: 0 },
    { name: "B", value: 1 },
    { name: "C", value: 2 },
  ]);
});

Deno.test("extractConstants extracts enum with explicit starting value", () => {
  const source = [
    "enum {",
    "\tAUTO_ORDINAL_FIRST = 1,",
    "\tAUTO_ORDINAL_SECOND,",
    "\tAUTO_ORDINAL_THIRD,",
    "};",
  ].join("\n");
  const result = extractConstants(source, "test.h");
  assertEquals(result.enums[0].variants, [
    { name: "AUTO_ORDINAL_FIRST", value: 1 },
    { name: "AUTO_ORDINAL_SECOND", value: 2 },
    { name: "AUTO_ORDINAL_THIRD", value: 3 },
  ]);
});

Deno.test("extractConstants extracts enum with mixed explicit values", () => {
  const source = [
    "enum {",
    "\tFLT_RANGE_UNSET = 0,",
    "\tFLT_RANGE_MISC_CUSTOM,",
    "\tFLT_RANGE_MISC_ALLDATE,",
    "\tFLT_RANGE_LAST_DAY = 20,",
    "\tFLT_RANGE_LAST_WEEK,",
    "};",
  ].join("\n");
  const result = extractConstants(source, "test.h");
  assertEquals(result.enums[0].variants, [
    { name: "FLT_RANGE_UNSET", value: 0 },
    { name: "FLT_RANGE_MISC_CUSTOM", value: 1 },
    { name: "FLT_RANGE_MISC_ALLDATE", value: 2 },
    { name: "FLT_RANGE_LAST_DAY", value: 20 },
    { name: "FLT_RANGE_LAST_WEEK", value: 21 },
  ]);
});

Deno.test("extractConstants extracts typedef'd enums with name", () => {
  const source = [
    "typedef enum {",
    "\tTXN_STATUS_NONE,",
    "\tTXN_STATUS_CLEARED,",
    "\tTXN_STATUS_RECONCILED,",
    "} HbTxnStatus;",
  ].join("\n");
  const result = extractConstants(source, "test.h");
  assertEquals(result.enums[0].name, "HbTxnStatus");
  assertEquals(result.enums[0].variants.length, 3);
  assertEquals(result.enums[0].variants[0], {
    name: "TXN_STATUS_NONE",
    value: 0,
  });
});

Deno.test("extractConstants handles enum with bit-shift values", () => {
  const source = [
    "enum",
    "{",
    "\tUF_TITLE     \t= 1 << 0,",
    "\tUF_SENSITIVE \t= 1 << 1,",
    "\tUF_VISUAL   \t= 1 << 2,",
    "};",
  ].join("\n");
  const result = extractConstants(source, "test.h");
  assertEquals(result.enums[0].variants, [
    { name: "UF_TITLE", value: 1 },
    { name: "UF_SENSITIVE", value: 2 },
    { name: "UF_VISUAL", value: 4 },
  ]);
});

Deno.test("extractConstants handles enum with negative values", () => {
  const source = [
    "typedef enum {",
    "\tGRPFLAG_ANY = -1,",
    "\tGRPFLAG_NONE = 0,",
    "\tGRPFLAG_RED = 1,",
    "\tGRPFLAG_ORANGE,",
    "} HbGrpFlag;",
  ].join("\n");
  const result = extractConstants(source, "test.h");
  assertEquals(result.enums[0].variants, [
    { name: "GRPFLAG_ANY", value: -1 },
    { name: "GRPFLAG_NONE", value: 0 },
    { name: "GRPFLAG_RED", value: 1 },
    { name: "GRPFLAG_ORANGE", value: 2 },
  ]);
});

Deno.test("extractConstants skips commented-out enum variants", () => {
  const source = [
    "enum {",
    "\tPAYMODE_NONE,",
    "\tPAYMODE_CCARD,",
    "\t//PAYMODE_UNUSED,",
    "\tPAYMODE_CHECK,",
    "};",
  ].join("\n");
  const result = extractConstants(source, "test.h");
  assertEquals(result.enums[0].variants, [
    { name: "PAYMODE_NONE", value: 0 },
    { name: "PAYMODE_CCARD", value: 1 },
    { name: "PAYMODE_CHECK", value: 2 },
  ]);
});

Deno.test("extractConstants skips enums inside block comments", () => {
  const source = [
    "/*",
    "enum {",
    "\tA,",
    "\tB,",
    "};*/",
    "",
    "enum {",
    "\tREAL_A,",
    "\tREAL_B,",
    "};",
  ].join("\n");
  const result = extractConstants(source, "test.h");
  assertEquals(result.enums.length, 1);
  assertEquals(result.enums[0].variants[0].name, "REAL_A");
});

// --- extractAllConstants ---

Deno.test("extractAllConstants merges results from multiple files", () => {
  const result = extractAllConstants([
    { name: "a.h", content: "#define A_VAL 1\nenum { A_ENUM };" },
    { name: "b.h", content: "#define B_VAL 2\nenum { B_ENUM };" },
  ]);
  assertEquals(result.defines.length, 2);
  assertEquals(result.enums.length, 2);
  assertEquals(result.defines[0].name, "A_VAL");
  assertEquals(result.defines[1].name, "B_VAL");
});

// --- Real vendored header tests ---

function vendorUrl(name: string): URL {
  return new URL(`vendor/homebank/${name}`, import.meta.url);
}

Deno.test({
  name: "extractConstants finds OF_* flags in hb-transaction.h",
  fn: async () => {
    const source = await Deno.readTextFile(vendorUrl("hb-transaction.h"));
    const result = extractConstants(source, "hb-transaction.h");

    const byName = new Map(result.defines.map((d) => [d.name, d]));

    assertEquals(byName.get("OF_INCOME")?.value, 2);
    assertEquals(byName.get("OF_INTXFER")?.value, 8);
    assertEquals(byName.get("OF_ADVXFER")?.value, 16);
    assertEquals(byName.get("OF_REMIND")?.value, 32);
    assertEquals(byName.get("OF_SPLIT")?.value, 256);
    assertEquals(byName.get("OF_ISIMPORT")?.value, 512);
    assertEquals(byName.get("OF_ISPAST")?.value, 1024);

    // Check deprecated flags are also extracted
    assertEquals(byName.get("OLDF_VALID")?.value, 1);
    assertEquals(byName.get("OLDF_PREFILLED")?.value, 2048);

    // Check enums
    const txnStatus = result.enums.find((e) => e.name === "HbTxnStatus");
    assertEquals(txnStatus?.variants.length, 4);
    assertEquals(txnStatus?.variants[0], {
      name: "TXN_STATUS_NONE",
      value: 0,
    });
    assertEquals(txnStatus?.variants[3], {
      name: "TXN_STATUS_VOID",
      value: 3,
    });
  },
});

Deno.test({
  name: "extractConstants finds AF_* flags in hb-account.h",
  fn: async () => {
    const source = await Deno.readTextFile(vendorUrl("hb-account.h"));
    const result = extractConstants(source, "hb-account.h");

    const byName = new Map(result.defines.map((d) => [d.name, d]));

    assertEquals(byName.get("AF_CLOSED")?.value, 2);
    assertEquals(byName.get("AF_NOSUMMARY")?.value, 16);
    assertEquals(byName.get("AF_NOBUDGET")?.value, 32);
    assertEquals(byName.get("AF_NOREPORT")?.value, 64);
    assertEquals(byName.get("AF_OUTFLOWSUM")?.value, 128);
    assertEquals(byName.get("AF_HASNOTICE")?.value, 512);

    // Check ACC_TYPE enum
    const accTypeEnum = result.enums.find((e) =>
      e.variants.some((v) => v.name === "ACC_TYPE_BANK")
    );
    assertEquals(accTypeEnum?.variants[0], {
      name: "ACC_TYPE_NONE",
      value: 0,
    });
    assertEquals(accTypeEnum?.variants[1], {
      name: "ACC_TYPE_BANK",
      value: 1,
    });
  },
});

Deno.test({
  name: "extractConstants finds GF_* flags in hb-category.h",
  fn: async () => {
    const source = await Deno.readTextFile(vendorUrl("hb-category.h"));
    const result = extractConstants(source, "hb-category.h");

    const byName = new Map(result.defines.map((d) => [d.name, d]));

    assertEquals(byName.get("GF_SUB")?.value, 1);
    assertEquals(byName.get("GF_INCOME")?.value, 2);
    assertEquals(byName.get("GF_CUSTOM")?.value, 4);
    assertEquals(byName.get("GF_BUDGET")?.value, 8);
    assertEquals(byName.get("GF_FORCED")?.value, 16);
    assertEquals(byName.get("GF_MIXED")?.value, 32);
    assertEquals(byName.get("GF_HIDDEN")?.value, 256);
  },
});

Deno.test({
  name: "extractConstants finds TF_* flags in hb-archive.h",
  fn: async () => {
    const source = await Deno.readTextFile(vendorUrl("hb-archive.h"));
    const result = extractConstants(source, "hb-archive.h");

    const byName = new Map(result.defines.map((d) => [d.name, d]));

    assertEquals(byName.get("TF_RECUR")?.value, 1);
    assertEquals(byName.get("TF_LIMIT")?.value, 2);
    assertEquals(byName.get("TF_RELATIVE")?.value, 4);

    // Check scheduled enum
    const freqEnum = result.enums.find((e) =>
      e.variants.some((v) => v.name === "AUTO_FREQ_DAY")
    );
    assertEquals(freqEnum?.variants[0], {
      name: "AUTO_FREQ_DAY",
      value: 0,
    });
    assertEquals(freqEnum?.variants[3], {
      name: "AUTO_FREQ_YEAR",
      value: 3,
    });
  },
});

Deno.test({
  name: "extractConstants finds ASGF_* flags in hb-assign.h",
  fn: async () => {
    const source = await Deno.readTextFile(vendorUrl("hb-assign.h"));
    const result = extractConstants(source, "hb-assign.h");

    const byName = new Map(result.defines.map((d) => [d.name, d]));

    assertEquals(byName.get("ASGF_EXACT")?.value, 1);
    assertEquals(byName.get("ASGF_DOPAY")?.value, 2);
    assertEquals(byName.get("ASGF_DOCAT")?.value, 4);
    assertEquals(byName.get("ASGF_DOMOD")?.value, 8);
    assertEquals(byName.get("ASGF_DOTAG")?.value, 16);
    assertEquals(byName.get("ASGF_REGEX")?.value, 256);
    assertEquals(byName.get("ASGF_OVWPAY")?.value, 512);
  },
});

Deno.test({
  name: "extractConstants finds FLT_* constants in hb-filter.h",
  fn: async () => {
    const source = await Deno.readTextFile(vendorUrl("hb-filter.h"));
    const result = extractConstants(source, "hb-filter.h");

    // FLT_QSEARCH_* are enum values with bit-shift expressions
    const qsearchEnum = result.enums.find((e) =>
      e.variants.some((v) => v.name === "FLT_QSEARCH_MEMO")
    );
    assertEquals(
      qsearchEnum?.variants.find((v) => v.name === "FLT_QSEARCH_MEMO")?.value,
      1,
    );
    assertEquals(
      qsearchEnum?.variants.find((v) => v.name === "FLT_QSEARCH_CATEGORY")
        ?.value,
      8,
    );
    assertEquals(
      qsearchEnum?.variants.find((v) => v.name === "FLT_QSEARCH_AMOUNT")
        ?.value,
      32,
    );

    // FLT_RANGE_* enum
    const rangeEnum = result.enums.find((e) =>
      e.variants.some((v) => v.name === "FLT_RANGE_UNSET")
    );
    assertEquals(
      rangeEnum?.variants.find((v) => v.name === "FLT_RANGE_UNSET")?.value,
      0,
    );
    assertEquals(
      rangeEnum?.variants.find((v) => v.name === "FLT_RANGE_LAST_DAY")?.value,
      20,
    );
    assertEquals(
      rangeEnum?.variants.find((v) => v.name === "FLT_RANGE_THIS_DAY")?.value,
      40,
    );
    assertEquals(
      rangeEnum?.variants.find((v) => v.name === "FLT_RANGE_NEXT_DAY")?.value,
      60,
    );
  },
});

Deno.test({
  name: "extractConstants finds key constants in homebank.h",
  fn: async () => {
    const source = await Deno.readTextFile(vendorUrl("homebank.h"));
    const result = extractConstants(source, "homebank.h");

    const byName = new Map(result.defines.map((d) => [d.name, d]));

    assertEquals(byName.get("HB_VERSION")?.value, "5.10");
    assertEquals(byName.get("FILE_VERSION")?.value, 1.6);
    assertEquals(byName.get("HOMEBANK_MAJOR")?.value, 5);
    assertEquals(byName.get("HOMEBANK_MINOR")?.value, 10);
    assertEquals(byName.get("HOMEBANK_MICRO")?.value, 0);
    assertEquals(byName.get("HB_DATE_MAX_GAP")?.value, 7);
    assertEquals(byName.get("HB_MINDATE")?.value, 693596);
    assertEquals(byName.get("HB_MAXDATE")?.value, 803533);
  },
});

Deno.test({
  name: "extractConstants finds enums in enums.h",
  fn: async () => {
    const source = await Deno.readTextFile(vendorUrl("enums.h"));
    const result = extractConstants(source, "enums.h");

    // PAYMODE enum
    const paymodeEnum = result.enums.find((e) =>
      e.variants.some((v) => v.name === "PAYMODE_NONE")
    );
    assertEquals(paymodeEnum?.variants[0], {
      name: "PAYMODE_NONE",
      value: 0,
    });
    assertEquals(
      paymodeEnum?.variants.find((v) => v.name === "PAYMODE_DCARD")?.value,
      6,
    );

    // GRPFLAG enum with negative value
    const grpflagEnum = result.enums.find((e) => e.name === "HbGrpFlag");
    assertEquals(
      grpflagEnum?.variants.find((v) => v.name === "GRPFLAG_ANY")?.value,
      -1,
    );
    assertEquals(
      grpflagEnum?.variants.find((v) => v.name === "GRPFLAG_NONE")?.value,
      0,
    );
  },
});

Deno.test({
  name: "extractConstants finds TXN_MAX_SPLIT in hb-split.h",
  fn: async () => {
    const source = await Deno.readTextFile(vendorUrl("hb-split.h"));
    const result = extractConstants(source, "hb-split.h");

    const byName = new Map(result.defines.map((d) => [d.name, d]));
    assertEquals(byName.get("TXN_MAX_SPLIT")?.value, 62);
  },
});

Deno.test({
  name: "extractAllConstants across multiple real headers",
  fn: async () => {
    const fileNames = ["hb-transaction.h", "hb-account.h", "hb-category.h"];
    const files = await Promise.all(
      fileNames.map(async (name) => ({
        name,
        content: await Deno.readTextFile(vendorUrl(name)),
      })),
    );

    const result = extractAllConstants(files);

    const byName = new Map(result.defines.map((d) => [d.name, d]));

    // From hb-transaction.h
    assertEquals(byName.get("OF_INCOME")?.value, 2);
    // From hb-account.h
    assertEquals(byName.get("AF_CLOSED")?.value, 2);
    // From hb-category.h
    assertEquals(byName.get("GF_INCOME")?.value, 2);

    // Enums from all files
    assertEquals(result.enums.length > 3, true);
  },
});
