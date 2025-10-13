/**
 * Tests for the serialization utilities.
 */

import { assertEquals } from "@std/assert";
import { deserializeFromJson, serializeToJson } from "./serialization.ts";

Deno.test("serializeToJson with Uint8Array", () => {
  const data = {
    bytes: new Uint8Array([1, 2, 3, 4]),
    regularNumber: 42,
  };

  const json = serializeToJson(data);
  const parsed = JSON.parse(json);

  assertEquals(parsed.bytes.$bytes, [1, 2, 3, 4]);
  assertEquals(parsed.regularNumber, 42);
});

Deno.test("serializeToJson with BigInt", () => {
  const data = {
    bigNumber: 12345678901234567890n,
    regularNumber: 42,
  };

  const json = serializeToJson(data);
  const parsed = JSON.parse(json);

  assertEquals(parsed.bigNumber.$bigint, "12345678901234567890");
  assertEquals(parsed.regularNumber, 42);
});

Deno.test("serializeToJson with mixed types", () => {
  const data = {
    bytes: new Uint8Array([255, 128, 64]),
    bigNumber: 98765432109876543210n,
    regularNumber: 42,
    string: "test",
    array: [1, 2, 3],
  };

  const json = serializeToJson(data);
  const parsed = JSON.parse(json);

  assertEquals(parsed.bytes.$bytes, [255, 128, 64]);
  assertEquals(parsed.bigNumber.$bigint, "98765432109876543210");
  assertEquals(parsed.regularNumber, 42);
  assertEquals(parsed.string, "test");
  assertEquals(parsed.array, [1, 2, 3]);
});

Deno.test("deserializeFromJson with Uint8Array", () => {
  const json = '{"bytes":{"$bytes":[1,2,3,4]},"regularNumber":42}';
  const data = deserializeFromJson(json) as Record<string, unknown>;

  assertEquals(data.bytes instanceof Uint8Array, true);
  assertEquals(data.bytes, new Uint8Array([1, 2, 3, 4]));
  assertEquals(data.regularNumber, 42);
});

Deno.test("deserializeFromJson with BigInt", () => {
  const json =
    '{"bigNumber":{"$bigint":"12345678901234567890"},"regularNumber":42}';
  const data = deserializeFromJson(json) as Record<string, unknown>;

  assertEquals(typeof data.bigNumber, "bigint");
  assertEquals(data.bigNumber, 12345678901234567890n);
  assertEquals(data.regularNumber, 42);
});

Deno.test("deserializeFromJson with mixed types", () => {
  const json =
    '{"bytes":{"$bytes":[255,128,64]},"bigNumber":{"$bigint":"98765432109876543210"},"regularNumber":42,"string":"test","array":[1,2,3]}';
  const data = deserializeFromJson(json) as Record<string, unknown>;

  assertEquals(data.bytes instanceof Uint8Array, true);
  assertEquals(data.bytes, new Uint8Array([255, 128, 64]));
  assertEquals(typeof data.bigNumber, "bigint");
  assertEquals(data.bigNumber, 98765432109876543210n);
  assertEquals(data.regularNumber, 42);
  assertEquals(data.string, "test");
  assertEquals(data.array, [1, 2, 3]);
});

Deno.test("roundtrip serialization with Uint8Array", () => {
  const original = {
    bytes: new Uint8Array([1, 2, 3, 4, 5]),
    regularNumber: 42,
  };

  const json = serializeToJson(original);
  const reconstructed = deserializeFromJson(json) as Record<string, unknown>;

  assertEquals(reconstructed.bytes instanceof Uint8Array, true);
  assertEquals(reconstructed.bytes, original.bytes);
  assertEquals(reconstructed.regularNumber, original.regularNumber);
});

Deno.test("roundtrip serialization with BigInt", () => {
  const original = {
    bigNumber: 12345678901234567890n,
    regularNumber: 42,
  };

  const json = serializeToJson(original);
  const reconstructed = deserializeFromJson(json) as Record<string, unknown>;

  assertEquals(typeof reconstructed.bigNumber, "bigint");
  assertEquals(reconstructed.bigNumber, original.bigNumber);
  assertEquals(reconstructed.regularNumber, original.regularNumber);
});

Deno.test("roundtrip serialization with mixed types", () => {
  const original = {
    bytes: new Uint8Array([255, 128, 64]),
    bigNumber: 98765432109876543210n,
    regularNumber: 42,
    string: "test",
    array: [1, 2, 3],
    nested: {
      innerBytes: new Uint8Array([10, 20, 30]),
      innerBigInt: 5555555555555555555n,
    },
  };

  const json = serializeToJson(original);
  const reconstructed = deserializeFromJson(json) as Record<string, unknown>;

  assertEquals(reconstructed.bytes instanceof Uint8Array, true);
  assertEquals(reconstructed.bytes, original.bytes);
  assertEquals(typeof reconstructed.bigNumber, "bigint");
  assertEquals(reconstructed.bigNumber, original.bigNumber);
  assertEquals(reconstructed.regularNumber, original.regularNumber);
  assertEquals(reconstructed.string, original.string);
  assertEquals(reconstructed.array, original.array);
  const nested = reconstructed.nested as Record<string, unknown>;
  assertEquals(nested.innerBytes instanceof Uint8Array, true);
  assertEquals(nested.innerBytes, original.nested.innerBytes);
  assertEquals(typeof nested.innerBigInt, "bigint");
  assertEquals(nested.innerBigInt, original.nested.innerBigInt);
});
