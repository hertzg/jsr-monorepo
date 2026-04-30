import { assertEquals, assertThrows } from "@std/assert";
import {
  bencode,
  type BencodeDict,
  type BencodeValue,
  dictEntry,
} from "./mod.ts";

const enc = (s: string) => new TextEncoder().encode(s);
const dec = (b: Uint8Array) => new TextDecoder().decode(b);

function roundTrip(value: BencodeValue, expectedWire: string): BencodeValue {
  const coder = bencode();
  const buf = new Uint8Array(4096);
  const written = coder.encode(value, buf);
  assertEquals(dec(buf.subarray(0, written)), expectedWire);
  const [decoded, read] = coder.decode(buf.subarray(0, written));
  assertEquals(read, written);
  return decoded;
}

Deno.test("bencode integers", async (t) => {
  await t.step("zero", () => {
    assertEquals(roundTrip(0n, "i0e"), 0n);
  });
  await t.step("positive", () => {
    assertEquals(roundTrip(42n, "i42e"), 42n);
  });
  await t.step("negative", () => {
    assertEquals(roundTrip(-3n, "i-3e"), -3n);
  });
  await t.step("very large (beyond Number.MAX_SAFE_INTEGER)", () => {
    const huge = 9_999_999_999_999_999_999n;
    assertEquals(roundTrip(huge, `i${huge}e`), huge);
  });
});

Deno.test("bencode byte strings", async (t) => {
  await t.step("empty", () => {
    const result = roundTrip(new Uint8Array(0), "0:");
    assertEquals((result as Uint8Array).length, 0);
  });
  await t.step("ascii", () => {
    const result = roundTrip(enc("spam"), "4:spam");
    assertEquals(dec(result as Uint8Array), "spam");
  });
  await t.step("non-utf8 bytes preserved", () => {
    const raw = new Uint8Array([0xff, 0x00, 0x80, 0x7f]);
    const coder = bencode();
    const buf = new Uint8Array(64);
    const written = coder.encode(raw, buf);
    const [decoded] = coder.decode(buf.subarray(0, written));
    assertEquals(decoded as Uint8Array, raw);
  });
});

Deno.test("bencode lists", async (t) => {
  await t.step("empty list", () => {
    const result = roundTrip([], "le");
    assertEquals(result, []);
  });
  await t.step("flat list of mixed types", () => {
    const result = roundTrip(
      [enc("spam"), 42n],
      "l4:spami42ee",
    );
    const arr = result as BencodeValue[];
    assertEquals(arr.length, 2);
    assertEquals(dec(arr[0] as Uint8Array), "spam");
    assertEquals(arr[1], 42n);
  });
  await t.step("nested list", () => {
    const result = roundTrip(
      [[1n, 2n], [enc("a")]],
      "lli1ei2eel1:aee",
    );
    assertEquals((result as BencodeValue[]).length, 2);
  });
});

Deno.test("bencode dicts", async (t) => {
  await t.step("flat dict (BEP 3 example)", () => {
    const result = roundTrip(
      [
        [enc("cow"), enc("moo")],
        [enc("spam"), enc("eggs")],
      ],
      "d3:cow3:moo4:spam4:eggse",
    );
    const entries = result as BencodeDict;
    assertEquals(entries.length, 2);
    assertEquals(dec(entries[0][0]), "cow");
    assertEquals(dec(entries[0][1] as Uint8Array), "moo");
  });

  await t.step("dict with list value", () => {
    const value: BencodeDict = [
      [enc("spam"), [enc("a"), enc("b")]],
    ];
    const result = roundTrip(value, "d4:spaml1:a1:bee");
    const entries = result as BencodeDict;
    assertEquals(entries.length, 1);
    assertEquals(dec(entries[0][0]), "spam");
  });

  await t.step("nested dict (torrent-like)", () => {
    const announce = enc("http://tracker.example/announce");
    const info: BencodeDict = [
      [enc("length"), 524288n],
      [enc("name"), enc("test.bin")],
      [enc("piece length"), 16384n],
      [enc("pieces"), new Uint8Array(20).fill(0xab)],
    ];
    const torrent: BencodeDict = [
      [enc("announce"), announce],
      [enc("info"), info],
    ];

    const coder = bencode();
    const buf = new Uint8Array(4096);
    const written = coder.encode(torrent, buf);
    const [decoded, read] = coder.decode(buf.subarray(0, written));
    assertEquals(read, written);

    const top = decoded as BencodeDict;
    assertEquals(top.length, 2);
    assertEquals(dec(top[0][0]), "announce");
    assertEquals(dec(top[0][1] as Uint8Array), dec(announce));
    assertEquals(dec(top[1][0]), "info");

    const decodedInfo = top[1][1] as BencodeDict;
    assertEquals(decodedInfo.length, 4);
    assertEquals(dec(decodedInfo[0][0]), "length");
    assertEquals(decodedInfo[0][1], 524288n);
    assertEquals(dec(decodedInfo[1][0]), "name");
    assertEquals(dec(decodedInfo[1][1] as Uint8Array), "test.bin");
    assertEquals(dec(decodedInfo[3][0]), "pieces");
    assertEquals((decodedInfo[3][1] as Uint8Array).length, 20);
  });
});

Deno.test("dictEntry helper", () => {
  const entry = dictEntry("cow", enc("moo"));
  assertEquals(dec(entry[0]), "cow");
  assertEquals(dec(entry[1] as Uint8Array), "moo");

  const rawKey = new Uint8Array([0xff, 0xfe]);
  const entry2 = dictEntry(rawKey, 1n);
  assertEquals(entry2[0], rawKey);
  assertEquals(entry2[1], 1n);
});

Deno.test("bencode rejects malformed input", async (t) => {
  const coder = bencode();

  await t.step("empty input", () => {
    assertThrows(() => coder.decode(new Uint8Array(0)), Error);
  });

  await t.step("unknown tag", () => {
    assertThrows(() => coder.decode(enc("x42e")), Error);
  });

  await t.step("integer with leading zero", () => {
    assertThrows(() => coder.decode(enc("i03e")), Error);
  });

  await t.step("negative zero integer", () => {
    assertThrows(() => coder.decode(enc("i-0e")), Error);
  });

  await t.step("integer missing terminator", () => {
    assertThrows(() => coder.decode(enc("i42")), Error);
  });

  await t.step("integer with no digits", () => {
    assertThrows(() => coder.decode(enc("ie")), Error);
  });

  await t.step("byte string with leading zero length", () => {
    assertThrows(() => coder.decode(enc("04:spam")), Error);
  });

  await t.step("byte string truncated", () => {
    assertThrows(() => coder.decode(enc("10:spam")), Error);
  });

  await t.step("unterminated list", () => {
    assertThrows(() => coder.decode(enc("li1e")), Error);
  });

  await t.step("unterminated dict", () => {
    assertThrows(() => coder.decode(enc("d3:cow3:moo")), Error);
  });

  await t.step("dict key not a byte string", () => {
    assertThrows(() => coder.decode(enc("di1ei2ee")), Error);
  });
});

Deno.test("bencode encode rejects unsupported types", () => {
  const coder = bencode();
  const buf = new Uint8Array(16);
  // deno-lint-ignore no-explicit-any
  assertThrows(() => coder.encode("spam" as any, buf), TypeError);
  // deno-lint-ignore no-explicit-any
  assertThrows(() => coder.encode(42 as any, buf), TypeError);
  // deno-lint-ignore no-explicit-any
  assertThrows(() => coder.encode(null as any, buf), TypeError);
});

Deno.test("bencode passes only-extra bytes after value through to caller", () => {
  // Decoder reports bytesRead so caller can detect trailing junk.
  const coder = bencode();
  const buf = enc("i42etrailing");
  const [value, read] = coder.decode(buf);
  assertEquals(value, 42n);
  assertEquals(read, 4);
});
