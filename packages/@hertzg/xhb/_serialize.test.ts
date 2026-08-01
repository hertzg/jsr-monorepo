import { assertEquals } from "@std/assert";
import {
  dtostr,
  hb_escape_text,
  hb_xml_attr_amt,
  hb_xml_attr_int,
  hb_xml_attr_int0,
  hb_xml_attr_txt,
  hb_xml_attr_txt_crlf,
  hb_xml_attrs_splits,
  hb_xml_tag,
  tags_toStr,
} from "./_serialize.ts";

// See the note in `_parse.test.ts`: omitted attributes reach the serializers
// as `undefined`.
const OMITTED = undefined as unknown as string;

Deno.test("hb_xml_attr_int omits an attribute whose value is 0", () => {
  // This is the single most load-bearing rule for byte fidelity: HomeBank
  // writes `cheque1="8760951"` but writes nothing at all for a zero
  // cheque number (ADR 0001).
  assertEquals(hb_xml_attr_int("cheque1", 8760951), 'cheque1="8760951"');
  assertEquals(hb_xml_attr_int("cheque1", 0), "");
});

Deno.test("hb_xml_attr_int0 writes the attribute even when it is 0", () => {
  // A handful of attributes are always written — `<properties auto_smode>`
  // is the one that uses this in practice.
  assertEquals(hb_xml_attr_int0("auto_smode", 0), 'auto_smode="0"');
  assertEquals(hb_xml_attr_int0("auto_smode", 1), 'auto_smode="1"');
});

Deno.test("hb_xml_attr_txt drops a missing value but keeps an empty one", () => {
  assertEquals(hb_xml_attr_txt("name", "Amazon"), 'name="Amazon"');
  assertEquals(hb_xml_attr_txt("name", ""), 'name=""');
  assertEquals(hb_xml_attr_txt("name", OMITTED), "");
});

Deno.test("amounts are written back as the exact text they were read as", () => {
  // dtostr is the identity because gDouble is already a string (ADR 0002);
  // there is deliberately no number formatting step here.
  assertEquals(dtostr("76.219999999999999"), "76.219999999999999");
  assertEquals(
    hb_xml_attr_amt("initial", "76.219999999999999"),
    'initial="76.219999999999999"',
  );

  // Unlike integers, a zero amount is still written.
  assertEquals(hb_xml_attr_amt("minimum", "0"), 'minimum="0"');
  assertEquals(hb_xml_attr_amt("minimum", OMITTED), "");
});

Deno.test("hb_xml_tag joins the surviving attributes into a self-closing tag", () => {
  assertEquals(
    hb_xml_tag("<pay", 'key="1"', "", 'name="Amazon"', ""),
    '<pay key="1" name="Amazon"/>',
  );

  // Every attribute dropped means no space before the slash.
  assertEquals(hb_xml_tag("<ope", "", ""), "<ope/>");
});

Deno.test("hb_escape_text escapes the five XML metacharacters as named entities", () => {
  assertEquals(hb_escape_text(`&<>'"`), "&amp;&lt;&gt;&apos;&quot;");
});

Deno.test("hb_escape_text escapes control characters as numeric entities", () => {
  assertEquals(hb_escape_text("a\nb"), "a&#xa;b");
  assertEquals(hb_escape_text("a\r\nb"), "a&#xd;&#xa;b");
  assertEquals(hb_escape_text("a\x1bb"), "a&#x1b;b");
  assertEquals(hb_escape_text("a\x7fb"), "a&#x7f;b");
  assertEquals(hb_escape_text("a\x9fb"), "a&#x9f;b");
});

Deno.test("hb_escape_text leaves tab, U+0085 and non-ASCII text alone", () => {
  // The escaped ranges are 0x01-0x08, 0x0a-0x1f, 0x7f-0x84 and 0x86-0x9f.
  // Tab (0x09) and NEL (0x85) fall in the gaps; this mirrors HomeBank's
  // hb_xml_escape_text exactly (ADR 0003) and must not be "tidied up".
  assertEquals(hb_escape_text("a\tb"), "a\tb");
  assertEquals(hb_escape_text("a\x85b"), "a\x85b");
  assertEquals(hb_escape_text("héllo €"), "héllo €");
});

Deno.test("only hb_xml_attr_txt_crlf escapes; plain text attributes are written raw", () => {
  // HomeBank has two text writers and uses the escaping one for exactly one
  // field (`<account notes>`). An ampersand in a payee or account *name* is
  // therefore emitted unescaped. That is a faithful copy of the C original
  // (ADR 0001/0003), not an oversight to fix here.
  assertEquals(hb_xml_attr_txt("name", "Ben & Jerry"), 'name="Ben & Jerry"');
  assertEquals(
    hb_xml_attr_txt_crlf("notes", "Ben & Jerry\nsecond line"),
    'notes="Ben &amp; Jerry&#xa;second line"',
  );
});

Deno.test("tags_toStr joins tag names with spaces", () => {
  assertEquals(tags_toStr(["groceries", "weekly"]), "groceries weekly");
  assertEquals(tags_toStr([]), "");
});

Deno.test("splits are written as three parallel ||-separated attributes", () => {
  // One `<ope>` attribute per split column: categories, amounts, memos.
  // The i-th split is the i-th entry of each list, so an empty memo still
  // has to occupy its slot.
  assertEquals(
    hb_xml_attrs_splits([
      { cat: 12, amt: "-15.5", mem: "bread" },
      { cat: 13, amt: "-4.5", mem: "" },
    ]),
    'scat="12||13" samt="-15.5||-4.5" smem="bread||"',
  );

  assertEquals(hb_xml_attrs_splits([]), "");
});

Deno.test("a pipe in a split memo would break the framing, so the first one is stripped", () => {
  // `|` is removed from split memos because it would corrupt the `||`
  // framing above — but only the first occurrence is removed. Mirrors the C
  // original (ADR 0001/0003); asserted here as-is rather than fixed.
  assertEquals(
    hb_xml_attrs_splits([{ cat: 1, amt: "-1", mem: "a|b|c" }]),
    'scat="1" samt="-1" smem="ab|c"',
  );
});
