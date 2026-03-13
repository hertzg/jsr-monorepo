import { assertEquals } from "@std/assert";
import { parseXhb, serializeXhb, type XmlElement } from "./xml.ts";

// --- parseXhb ---

Deno.test("parseXhb", async (t) => {
  await t.step("parses self-closing tags", () => {
    const xml = '<pay key="1" name="Test"/>';
    const elements = parseXhb(xml);
    assertEquals(elements.length, 1);
    assertEquals(elements[0].tag, "pay");
    assertEquals(elements[0].attrs, { key: "1", name: "Test" });
  });

  await t.step("parses homebank root tag as element", () => {
    const xml = '<homebank v="1.6" d="050201">';
    const elements = parseXhb(xml);
    assertEquals(elements.length, 1);
    assertEquals(elements[0].tag, "homebank");
    assertEquals(elements[0].attrs, { v: "1.6", d: "050201" });
  });

  await t.step("skips XML declaration", () => {
    const xml = '<?xml version="1.0"?>\n<homebank v="1.6">';
    const elements = parseXhb(xml);
    assertEquals(elements.length, 1);
    assertEquals(elements[0].tag, "homebank");
  });

  await t.step("skips closing homebank tag", () => {
    const xml =
      '<?xml version="1.0"?>\n<homebank v="1.6">\n<pay key="1"/>\n</homebank>';
    const elements = parseXhb(xml);
    assertEquals(elements.length, 2);
    assertEquals(elements[0].tag, "homebank");
    assertEquals(elements[1].tag, "pay");
  });

  await t.step("parses full XHB structure", () => {
    const xml = [
      '<?xml version="1.0"?>',
      '<homebank v="1.6" d="050201">',
      '<account key="1" flags="0" name="Checking"/>',
      '<pay key="1" name="Groceries"/>',
      '<pay key="2" name="Rent"/>',
      "</homebank>",
    ].join("\n");
    const elements = parseXhb(xml);
    assertEquals(elements.length, 4);
    assertEquals(elements[0].tag, "homebank");
    assertEquals(elements[1].tag, "account");
    assertEquals(elements[1].attrs.name, "Checking");
    assertEquals(elements[2].tag, "pay");
    assertEquals(elements[2].attrs.name, "Groceries");
    assertEquals(elements[3].tag, "pay");
    assertEquals(elements[3].attrs.name, "Rent");
  });

  await t.step("unescapes standard XML entities in attribute values", () => {
    const xml = '<pay name="A &amp; B &lt;C&gt; &quot;D&quot; &apos;E&apos;"/>';
    const elements = parseXhb(xml);
    assertEquals(elements[0].attrs.name, "A & B <C> \"D\" 'E'");
  });

  await t.step("handles numeric character references", () => {
    const xml = '<pay name="line1&#xa;line2"/>';
    const elements = parseXhb(xml);
    assertEquals(elements[0].attrs.name, "line1\nline2");
  });

  await t.step("handles tag with no attributes", () => {
    const xml = "<properties/>";
    const elements = parseXhb(xml);
    assertEquals(elements.length, 1);
    assertEquals(elements[0].tag, "properties");
    assertEquals(elements[0].attrs, {});
  });

  await t.step("handles escaped quotes inside attribute values", () => {
    const xml =
      '<pay name="he said &quot;hello&quot;" memo="it&apos;s fine"/>';
    const elements = parseXhb(xml);
    assertEquals(elements[0].attrs.name, 'he said "hello"');
    assertEquals(elements[0].attrs.memo, "it's fine");
  });

  await t.step("handles single-quoted attributes", () => {
    const xml = "<pay key='1' name='Test'/>";
    const elements = parseXhb(xml);
    assertEquals(elements[0].attrs, { key: "1", name: "Test" });
  });
});

// --- serializeXhb ---

Deno.test("serializeXhb", async (t) => {
  await t.step("produces correct XHB format", () => {
    const elements: XmlElement[] = [
      { tag: "homebank", attrs: { v: "1.6" } },
      { tag: "pay", attrs: { key: "1", name: "Test" } },
    ];
    const xml = serializeXhb(elements);
    assertEquals(
      xml,
      '<?xml version="1.0"?>\n<homebank v="1.6">\n<pay key="1" name="Test"/>\n</homebank>\n',
    );
  });

  await t.step("handles homebank root only", () => {
    const elements: XmlElement[] = [
      { tag: "homebank", attrs: { v: "1.6" } },
    ];
    const xml = serializeXhb(elements);
    assertEquals(
      xml,
      '<?xml version="1.0"?>\n<homebank v="1.6">\n</homebank>\n',
    );
  });

  await t.step("handles empty elements array", () => {
    const xml = serializeXhb([]);
    assertEquals(xml, '<?xml version="1.0"?>\n');
  });

  await t.step("escapes attribute values", () => {
    const elements: XmlElement[] = [
      { tag: "homebank", attrs: {} },
      { tag: "pay", attrs: { name: 'A & B "C"' } },
    ];
    const xml = serializeXhb(elements);
    assertEquals(
      xml,
      '<?xml version="1.0"?>\n<homebank>\n<pay name="A &amp; B &quot;C&quot;"/>\n</homebank>\n',
    );
  });

  await t.step("handles multiple child elements", () => {
    const elements: XmlElement[] = [
      { tag: "homebank", attrs: { v: "1.6" } },
      { tag: "account", attrs: { key: "1" } },
      { tag: "pay", attrs: { key: "1" } },
      { tag: "cat", attrs: { key: "1" } },
    ];
    const xml = serializeXhb(elements);
    const lines = xml.split("\n");
    assertEquals(lines[0], '<?xml version="1.0"?>');
    assertEquals(lines[1], '<homebank v="1.6">');
    assertEquals(lines[2], '<account key="1"/>');
    assertEquals(lines[3], '<pay key="1"/>');
    assertEquals(lines[4], '<cat key="1"/>');
    assertEquals(lines[5], "</homebank>");
    assertEquals(lines[6], "");
  });
});

// --- round-trip parse -> serialize ---

Deno.test("parseXhb/serializeXhb round-trip", async (t) => {
  await t.step("round-trip preserves structure", () => {
    const original =
      '<?xml version="1.0"?>\n<homebank v="1.6">\n<pay key="1" name="Test"/>\n</homebank>\n';
    const elements = parseXhb(original);
    const serialized = serializeXhb(elements);
    assertEquals(serialized, original);
  });

  await t.step("round-trip with multiple elements", () => {
    const original = [
      '<?xml version="1.0"?>',
      '<homebank v="1.6" d="050201">',
      '<account key="1" name="Checking"/>',
      '<pay key="1" name="Groceries"/>',
      '<pay key="2" name="Rent"/>',
      "</homebank>",
      "",
    ].join("\n");
    const elements = parseXhb(original);
    const serialized = serializeXhb(elements);
    assertEquals(serialized, original);
  });

  await t.step("round-trip with escaped characters", () => {
    const original =
      '<?xml version="1.0"?>\n<homebank v="1.6">\n<pay key="1" name="A &amp; B"/>\n</homebank>\n';
    const elements = parseXhb(original);
    assertEquals(elements[1].attrs.name, "A & B");
    const serialized = serializeXhb(elements);
    assertEquals(serialized, original);
  });
});
