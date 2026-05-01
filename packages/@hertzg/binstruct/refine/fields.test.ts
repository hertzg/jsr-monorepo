import { assertEquals } from "@std/assert";
import { bytes } from "../bytes/bytes.ts";
import { u16be, u8 } from "../numeric/numeric.ts";
import { string } from "../string/string.ts";
import { struct } from "../struct/struct.ts";
import { refine } from "./refine.ts";
import { refineSwitch } from "./switch.ts";
import { refineFields } from "./fields.ts";

Deno.test("refineFields: refines a single payload field", () => {
  const inner = struct({ a: u8(), b: u8() });
  const outer = struct({ tag: u16be(), payload: bytes(2) });

  const coder = refine(outer, refineFields({ payload: inner }))();
  const buffer = new Uint8Array(4);
  const written = coder.encode(
    { tag: 0xbeef, payload: { a: 1, b: 2 } },
    buffer,
  );
  const [decoded, read] = coder.decode(buffer);

  assertEquals(written, 4);
  assertEquals(read, 4);
  assertEquals(decoded.tag, 0xbeef);
  assertEquals(decoded.payload.a, 1);
  assertEquals(decoded.payload.b, 2);
});

Deno.test("refineFields: refines multiple fields in one pass", () => {
  const word = struct({ value: u16be() });
  const host = struct({ a: bytes(2), b: bytes(2) });

  const coder = refine(host, refineFields({ a: word, b: word }))();
  const buffer = new Uint8Array(4);
  const written = coder.encode(
    { a: { value: 0x1234 }, b: { value: 0x5678 } },
    buffer,
  );
  const [decoded, read] = coder.decode(buffer);

  assertEquals(written, 4);
  assertEquals(read, 4);
  assertEquals(decoded.a.value, 0x1234);
  assertEquals(decoded.b.value, 0x5678);
});

Deno.test("refineFields: unlisted fields pass through unchanged", () => {
  const inner = struct({ value: u8() });
  const host = struct({
    keepMe: u16be(),
    refined: bytes(1),
    alsoKeepMe: u8(),
  });

  const coder = refine(host, refineFields({ refined: inner }))();
  const buffer = new Uint8Array(4);
  const written = coder.encode(
    { keepMe: 0xcafe, refined: { value: 7 }, alsoKeepMe: 0x42 },
    buffer,
  );
  const [decoded, read] = coder.decode(buffer);

  assertEquals(written, 4);
  assertEquals(read, 4);
  assertEquals(decoded.keepMe, 0xcafe);
  assertEquals(decoded.refined.value, 7);
  assertEquals(decoded.alsoKeepMe, 0x42);
});

Deno.test("refineFields: composes as a refineSwitch arm", () => {
  type Tag = 1 | 2;
  const word = struct({ value: u16be() });
  const text = struct({ value: string() });
  const base = struct({ tag: u8(), payload: bytes(2) });

  const coder = refineSwitch(
    base,
    {
      word: refineFields({ payload: word }),
      text: refineFields({ payload: text }),
    },
    {
      refine: (host) => (host.tag === 1 ? "word" : "text"),
      unrefine: (host) => (host.tag === 1 ? "word" : "text"),
    },
  );

  const buffer = new Uint8Array(8);

  // Encode a word-payload entry.
  const wordValue = {
    tag: 1 as Tag,
    payload: { value: 0xabcd },
  } as const;
  const written = coder.encode(wordValue, buffer);
  const [decoded] = coder.decode(buffer.subarray(0, written));

  assertEquals(decoded.tag, 1);
  assertEquals("value" in decoded.payload, true);
  if ("value" in decoded.payload && typeof decoded.payload.value === "number") {
    assertEquals(decoded.payload.value, 0xabcd);
  }
});

Deno.test("refineFields: round-trips an empty coder map (identity)", () => {
  const host = struct({ a: u8(), b: u8() });

  const coder = refine(host, refineFields({}))();
  const buffer = new Uint8Array(2);
  const written = coder.encode({ a: 1, b: 2 }, buffer);
  const [decoded, read] = coder.decode(buffer);

  assertEquals(written, 2);
  assertEquals(read, 2);
  assertEquals(decoded, { a: 1, b: 2 });
});
