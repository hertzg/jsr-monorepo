import { assertEquals } from "@std/assert";
import {
  conditionalDamtExtension,
  OF_ADVXFER,
  parseConditionalAmount,
  serializeConditionalAmount,
} from "./conditional.ts";

Deno.test("OF_ADVXFER - has correct flag value", () => {
  assertEquals(OF_ADVXFER, 16);
  assertEquals(OF_ADVXFER, 1 << 4);
});

Deno.test("parseConditionalAmount - parses existing attribute", () => {
  assertEquals(parseConditionalAmount({ damt: "42.5" }, "damt"), 42.5);
});

Deno.test("parseConditionalAmount - returns undefined for missing attribute", () => {
  assertEquals(parseConditionalAmount({}, "damt"), undefined);
});

Deno.test("parseConditionalAmount - handles zero value", () => {
  assertEquals(parseConditionalAmount({ damt: "0" }, "damt"), 0);
});

Deno.test("parseConditionalAmount - handles negative value", () => {
  assertEquals(parseConditionalAmount({ damt: "-99.5" }, "damt"), -99.5);
});

Deno.test("serializeConditionalAmount - emits when flag is set", () => {
  const entity = { flags: OF_ADVXFER, damt: 42.5 };

  const attrs = serializeConditionalAmount(
    entity,
    "damt",
    "damt",
    "flags",
    OF_ADVXFER,
  );

  assertEquals(attrs, ['damt="42.5"']);
});

Deno.test("serializeConditionalAmount - omits when flag is not set", () => {
  const entity = { flags: 0, damt: 42.5 };

  const attrs = serializeConditionalAmount(
    entity,
    "damt",
    "damt",
    "flags",
    OF_ADVXFER,
  );

  assertEquals(attrs, []);
});

Deno.test("serializeConditionalAmount - omits when value is undefined", () => {
  const entity: Record<string, unknown> = { flags: OF_ADVXFER };

  const attrs = serializeConditionalAmount(
    entity,
    "damt",
    "damt",
    "flags",
    OF_ADVXFER,
  );

  assertEquals(attrs, []);
});

Deno.test("serializeConditionalAmount - works with combined flags", () => {
  const entity = { flags: OF_ADVXFER | (1 << 1) | (1 << 8), damt: 100 };

  const attrs = serializeConditionalAmount(
    entity,
    "damt",
    "damt",
    "flags",
    OF_ADVXFER,
  );

  assertEquals(attrs, ['damt="100"']);
});

Deno.test("serializeConditionalAmount - omits when flags field is missing", () => {
  const entity = { damt: 42.5 };

  const attrs = serializeConditionalAmount(
    entity,
    "damt",
    "damt",
    "flags",
    OF_ADVXFER,
  );

  assertEquals(attrs, []);
});

Deno.test("conditionalDamtExtension - parse with damt attribute", () => {
  const ext = conditionalDamtExtension();
  const entity: Record<string, unknown> = {};

  ext.parse({ damt: "99.5" }, entity);
  assertEquals(entity["damt"], 99.5);
});

Deno.test("conditionalDamtExtension - parse without damt attribute", () => {
  const ext = conditionalDamtExtension();
  const entity: Record<string, unknown> = {};

  ext.parse({ amount: "100" }, entity);
  assertEquals(entity["damt"], undefined);
});

Deno.test("conditionalDamtExtension - serialize with flag set", () => {
  const ext = conditionalDamtExtension();
  const entity: Record<string, unknown> = {
    flags: OF_ADVXFER,
    damt: 99.5,
  };

  assertEquals(ext.serialize(entity), ['damt="99.5"']);
});

Deno.test("conditionalDamtExtension - serialize without flag", () => {
  const ext = conditionalDamtExtension();
  const entity: Record<string, unknown> = {
    flags: 0,
    damt: 99.5,
  };

  assertEquals(ext.serialize(entity), []);
});

Deno.test("conditionalDamtExtension - round-trip with flag set", () => {
  const ext = conditionalDamtExtension();
  const entity: Record<string, unknown> = { flags: OF_ADVXFER };

  ext.parse({ damt: "42.5" }, entity);
  assertEquals(entity["damt"], 42.5);

  const attrs = ext.serialize(entity);
  assertEquals(attrs, ['damt="42.5"']);
});

Deno.test("conditionalDamtExtension - round-trip without flag", () => {
  const ext = conditionalDamtExtension();
  const entity: Record<string, unknown> = { flags: 0 };

  ext.parse({ damt: "42.5" }, entity);
  assertEquals(entity["damt"], 42.5);

  const attrs = ext.serialize(entity);
  assertEquals(attrs, []);
});
