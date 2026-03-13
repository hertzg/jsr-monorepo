import { assertEquals } from "@std/assert";
import { extract, type ExtractionManifest } from "./extractor.ts";
import { dirname, fromFileUrl, resolve } from "@std/path";

const VENDOR_DIR = resolve(
  dirname(fromFileUrl(import.meta.url)),
  "vendor/homebank",
);

let manifest: ExtractionManifest;

Deno.test("extract produces a valid manifest", async () => {
  manifest = await extract(VENDOR_DIR);
  assertEquals(manifest.source.version, "5.10");
  assertEquals(manifest.source.commit, "6b2e02f");
});

Deno.test("headers are keyed by filename", () => {
  const names = Object.keys(manifest.headers);
  assertEquals(names.includes("homebank.h"), true);
  assertEquals(names.includes("enums.h"), true);
  assertEquals(names.includes("hb-transaction.h"), true);
});

Deno.test("header defines are extracted with evaluated values", () => {
  const txn = manifest.headers["hb-transaction.h"];
  const ofIncome = txn.defines.find((d) => d.name === "OF_INCOME");
  assertEquals(ofIncome !== undefined, true);
  assertEquals(ofIncome!.value, 2);
});

Deno.test("header enums are extracted", () => {
  const colorScheme = manifest.headers["enums.h"].enums.find(
    (e) => e.name === "ColorScheme",
  );
  assertEquals(colorScheme !== undefined, true);
  assertEquals(colorScheme!.variants[0], { name: "DEFAULT", value: 0 });
});

Deno.test("all function definitions are indexed", () => {
  const fnNames = Object.keys(manifest.functions);
  assertEquals(fnNames.includes("start_element_handler"), true);
  assertEquals(fnNames.includes("homebank_load_xml_pay"), true);
  assertEquals(fnNames.includes("homebank_save_xml_pay"), true);
  assertEquals(fnNames.includes("homebank_save_xml"), true);
});

Deno.test("call sites capture function name and string args", () => {
  const pay = manifest.functions["homebank_save_xml_pay"];
  const appendCalls = pay.callSites.filter((cs) =>
    cs.fn === "hb_xml_append_int" || cs.fn === "hb_xml_append_txt" ||
    cs.fn === "hb_xml_append_txt_crlf"
  );
  assertEquals(appendCalls.length > 0, true);
  const keyCall = appendCalls.find((cs) => cs.stringArgs.includes("key"));
  assertEquals(keyCall?.fn, "hb_xml_append_int");
});

Deno.test("call sites capture guard conditions", () => {
  const fav = manifest.functions["homebank_save_xml_fav"];
  const damtCall = fav.callSites.find(
    (cs) => cs.fn === "hb_xml_append_amt" && cs.stringArgs.includes("damt"),
  );
  assertEquals(damtCall !== undefined, true);
  assertEquals(damtCall!.guard?.includes("OF_ADVXFER"), true);
});

Deno.test("call sites with no guard have null", () => {
  const pay = manifest.functions["homebank_load_xml_pay"];
  const malloc = pay.callSites.find((cs) => cs.fn === "da_pay_malloc");
  assertEquals(malloc?.guard, null);
});

Deno.test("call sites capture identifier args", () => {
  const flt = manifest.functions["homebank_save_xml_flt"];
  const fltgrp = flt.callSites.filter(
    (cs) => cs.fn === "hb_xml_append_fltgroup",
  );
  assertEquals(fltgrp.length > 0, true);
  const datCall = fltgrp.find((cs) => cs.stringArgs.includes("dat"));
  assertEquals(datCall?.identifierArgs.includes("FLT_GRP_DATE"), true);
});

Deno.test("extracted.json matches freshly generated output", async () => {
  const extractedPath = new URL("./extracted.json", import.meta.url);
  const existing = await Deno.readTextFile(extractedPath);
  const fresh = JSON.stringify(manifest, null, 2) + "\n";
  assertEquals(existing, fresh);
});
