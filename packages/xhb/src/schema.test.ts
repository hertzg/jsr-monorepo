import { assertEquals } from "@std/assert";
import {
  type EntitySchema,
  parseEntity,
  parseField,
  serializeEntity,
  serializeField,
} from "./schema.ts";

// --- parseField ---

Deno.test("parseField", async (t) => {
  await t.step("int: parses integer strings", () => {
    assertEquals(parseField("42", "int"), 42);
    assertEquals(parseField("0", "int"), 0);
    assertEquals(parseField("-1", "int"), -1);
    assertEquals(parseField("999999", "int"), 999999);
  });

  await t.step("int0: parses identically to int", () => {
    assertEquals(parseField("42", "int0"), 42);
    assertEquals(parseField("0", "int0"), 0);
    assertEquals(parseField("-5", "int0"), -5);
  });

  await t.step("txt: returns string as-is", () => {
    assertEquals(parseField("hello", "txt"), "hello");
    assertEquals(parseField("", "txt"), "");
    assertEquals(parseField("a & b", "txt"), "a & b");
  });

  await t.step("txt_crlf: unescapes hex entities for CR/LF", () => {
    assertEquals(parseField("line1&#xa;line2", "txt_crlf"), "line1\nline2");
    assertEquals(parseField("line1&#xd;line2", "txt_crlf"), "line1\rline2");
    assertEquals(
      parseField("a&#xd;&#xa;b", "txt_crlf"),
      "a\r\nb",
    );
    assertEquals(parseField("no escapes", "txt_crlf"), "no escapes");
  });

  await t.step("amt: parses float strings", () => {
    assertEquals(parseField("3.14", "amt"), 3.14);
    assertEquals(parseField("0", "amt"), 0);
    assertEquals(parseField("-42.5", "amt"), -42.5);
    assertEquals(parseField("1000", "amt"), 1000);
    assertEquals(parseField("0.001", "amt"), 0.001);
  });
});

// --- serializeField ---

Deno.test("serializeField", async (t) => {
  await t.step("int: always serializes", () => {
    assertEquals(serializeField(42, "int"), "42");
    assertEquals(serializeField(0, "int"), "0");
    assertEquals(serializeField(-1, "int"), "-1");
  });

  await t.step("int0: omits when value is 0", () => {
    assertEquals(serializeField(0, "int0"), "");
    assertEquals(serializeField(42, "int0"), "42");
    assertEquals(serializeField(-1, "int0"), "-1");
  });

  await t.step("txt: XML-escapes the string", () => {
    assertEquals(serializeField("hello", "txt"), "hello");
    assertEquals(serializeField("a & b", "txt"), "a &amp; b");
    assertEquals(serializeField('say "hi"', "txt"), "say &quot;hi&quot;");
    assertEquals(serializeField("<tag>", "txt"), "&lt;tag&gt;");
    assertEquals(serializeField("it's", "txt"), "it&apos;s");
  });

  await t.step("txt_crlf: encodes CR/LF as hex entities", () => {
    assertEquals(serializeField("line1\nline2", "txt_crlf"), "line1&#xa;line2");
    assertEquals(serializeField("line1\rline2", "txt_crlf"), "line1&#xd;line2");
    assertEquals(serializeField("a\r\nb", "txt_crlf"), "a&#xd;&#xa;b");
    assertEquals(
      serializeField("a & b\nnext", "txt_crlf"),
      "a &amp; b&#xa;next",
    );
  });

  await t.step("amt: formats with up to 10 significant digits", () => {
    assertEquals(serializeField(3.14, "amt"), "3.14");
    assertEquals(serializeField(0, "amt"), "0");
    assertEquals(serializeField(1000, "amt"), "1000");
    assertEquals(serializeField(-42.5, "amt"), "-42.5");
    assertEquals(serializeField(0.001, "amt"), "0.001");
  });
});

// --- round-trip parseField / serializeField ---

Deno.test("parseField/serializeField round-trip", async (t) => {
  await t.step("int round-trip", () => {
    assertEquals(parseField(serializeField(42, "int"), "int"), 42);
    assertEquals(parseField(serializeField(0, "int"), "int"), 0);
  });

  await t.step("txt round-trip", () => {
    assertEquals(parseField(serializeField("hello", "txt"), "txt"), "hello");
  });

  await t.step("amt round-trip", () => {
    assertEquals(parseField(serializeField(3.14, "amt"), "amt"), 3.14);
    assertEquals(parseField(serializeField(0, "amt"), "amt"), 0);
  });
});

// --- parseEntity ---

Deno.test("parseEntity", async (t) => {
  const schema: EntitySchema = {
    tag: "pay",
    fields: [
      { attr: "key", type: "int" },
      { attr: "name", type: "txt" },
      { attr: "amount", type: "amt" },
      { attr: "flags", type: "int0" },
      { attr: "notes", type: "txt_crlf" },
    ],
  };

  await t.step("parses all field types from attributes", () => {
    const attrs = {
      key: "1",
      name: "Groceries",
      amount: "42.50",
      flags: "3",
      notes: "line1&#xa;line2",
    };
    const result = parseEntity(schema, attrs);
    assertEquals(result, {
      key: 1,
      name: "Groceries",
      amount: 42.5,
      flags: 3,
      notes: "line1\nline2",
    });
  });

  await t.step("provides defaults for missing attributes", () => {
    const result = parseEntity(schema, { key: "5" });
    assertEquals(result, {
      key: 5,
      name: "",
      amount: 0,
      flags: 0,
      notes: "",
    });
  });

  await t.step("calls parse extension hook", () => {
    const extSchema: EntitySchema = {
      tag: "custom",
      fields: [{ attr: "key", type: "int" }],
      extensions: {
        parse: (attrs, entity) => {
          if (attrs["extra"]) {
            entity["extra"] = attrs["extra"].toUpperCase();
          }
        },
      },
    };
    const result = parseEntity(extSchema, { key: "1", extra: "hello" });
    assertEquals(result, { key: 1, extra: "HELLO" });
  });
});

// --- serializeEntity ---

Deno.test("serializeEntity", async (t) => {
  const schema: EntitySchema = {
    tag: "pay",
    fields: [
      { attr: "key", type: "int" },
      { attr: "name", type: "txt" },
      { attr: "amount", type: "amt" },
    ],
  };

  await t.step("produces self-closing tag with attributes", () => {
    const result = serializeEntity(schema, {
      key: 1,
      name: "Groceries",
      amount: 42.5,
    });
    assertEquals(result, '<pay key="1" name="Groceries" amount="42.5"/>\n');
  });

  await t.step("omits empty txt fields", () => {
    const result = serializeEntity(schema, {
      key: 1,
      name: "",
      amount: 0,
    });
    assertEquals(result, '<pay key="1" amount="0"/>\n');
  });

  await t.step("omits int0 fields when value is 0", () => {
    const int0Schema: EntitySchema = {
      tag: "item",
      fields: [
        { attr: "key", type: "int" },
        { attr: "flags", type: "int0" },
      ],
    };
    const result = serializeEntity(int0Schema, { key: 0, flags: 0 });
    assertEquals(result, '<item key="0"/>\n');
  });

  await t.step("includes int0 fields when value is non-zero", () => {
    const int0Schema: EntitySchema = {
      tag: "item",
      fields: [
        { attr: "key", type: "int" },
        { attr: "flags", type: "int0" },
      ],
    };
    const result = serializeEntity(int0Schema, { key: 1, flags: 5 });
    assertEquals(result, '<item key="1" flags="5"/>\n');
  });

  await t.step("omits null and undefined fields", () => {
    const result = serializeEntity(schema, {
      key: 1,
    });
    assertEquals(result, '<pay key="1"/>\n');
  });

  await t.step("calls serialize extension hook", () => {
    const extSchema: EntitySchema = {
      tag: "custom",
      fields: [{ attr: "key", type: "int" }],
      extensions: {
        serialize: (entity) => {
          const parts: string[] = [];
          if (entity["extra"]) {
            parts.push(`extra="${entity["extra"]}"`);
          }
          return parts;
        },
      },
    };
    const result = serializeEntity(extSchema, { key: 1, extra: "data" });
    assertEquals(result, '<custom key="1" extra="data"/>\n');
  });

  await t.step("serialize extension returns empty for no extra attrs", () => {
    const extSchema: EntitySchema = {
      tag: "custom",
      fields: [{ attr: "key", type: "int" }],
      extensions: {
        serialize: (_entity) => [],
      },
    };
    const result = serializeEntity(extSchema, { key: 1 });
    assertEquals(result, '<custom key="1"/>\n');
  });
});

// --- txt_crlf escaping edge cases ---

Deno.test("txt_crlf escaping edge cases", async (t) => {
  await t.step("tab character (0x9) is NOT encoded — falls between ranges", () => {
    const serialized = serializeField("a\tb", "txt_crlf");
    assertEquals(serialized, "a\tb");
  });

  await t.step("control characters in range 0x1-0x8 are encoded", () => {
    const serialized = serializeField("a\x01b", "txt_crlf");
    assertEquals(serialized, "a&#x1;b");
    assertEquals(parseField(serialized, "txt_crlf"), "a\x01b");
  });

  await t.step("normal text passes through unchanged", () => {
    assertEquals(serializeField("hello world", "txt_crlf"), "hello world");
  });
});

// --- amt precision edge cases ---

Deno.test("amt precision edge cases", async (t) => {
  await t.step("large numbers", () => {
    const val = 1234567890;
    const serialized = serializeField(val, "amt");
    assertEquals(parseField(serialized, "amt"), val);
  });

  await t.step("very small fractions", () => {
    const val = 0.0000001;
    const serialized = serializeField(val, "amt");
    assertEquals(parseField(serialized, "amt"), val);
  });

  await t.step("negative amounts", () => {
    const val = -123.45;
    const serialized = serializeField(val, "amt");
    assertEquals(parseField(serialized, "amt"), val);
  });
});
