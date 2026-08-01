import { assertEquals } from "@std/assert";
import { atoi, parseGCharP, parseGDouble } from "./_parse.ts";

// HomeBank omits an attribute rather than writing an empty one, so every
// parse primitive is routinely handed `undefined` even though the XML
// attribute map is typed as `Record<string, string>`.
const OMITTED = undefined as unknown as string;

Deno.test("atoi turns an omitted attribute into 0, which is what makes round-trip work", () => {
  // The serializer drops integer attributes equal to 0, so "missing" and "0"
  // are the same value in both directions (ADR 0001).
  assertEquals(atoi(OMITTED), 0);
  assertEquals(atoi(null as unknown as string), 0);
});

Deno.test("atoi reads leading digits and stops, like C atoi", () => {
  assertEquals(atoi("42"), 42);
  assertEquals(atoi("-30"), -30);
  assertEquals(atoi("12abc"), 12);

  // The `d` version attribute is written zero-padded; leading zeros are
  // decimal, not octal.
  assertEquals(atoi("050402"), 50402);
});

Deno.test("atoi returns NaN for an attribute that is present but not a number", () => {
  // Only *missing* attributes become 0. A present-but-garbage attribute is
  // passed through as NaN rather than being silently repaired — the library
  // does not clean up input (ADR 0001).
  assertEquals(atoi(""), NaN);
  assertEquals(atoi("abc"), NaN);
});

Deno.test("parseGDouble keeps the original text so precision survives the round trip", () => {
  // HomeBank writes C doubles at full precision. Parsing these through
  // Number() would give 76.22 / 1.4 and re-serialize shorter strings, so
  // gDouble is a string end to end (ADR 0002).
  assertEquals(parseGDouble("76.219999999999999"), "76.219999999999999");
  assertEquals(parseGDouble("1.3999999999999999"), "1.3999999999999999");
  assertEquals(
    parseGDouble("0.00020000000000000001"),
    "0.00020000000000000001",
  );
  assertEquals(parseGDouble("-42.5"), "-42.5");
});

Deno.test("parseGCharP passes text through and leaves an omitted attribute undefined", () => {
  assertEquals(parseGCharP("Cheque Account"), "Cheque Account");

  // An empty attribute is a real empty string; a missing one is undefined,
  // and the serializer only drops the latter.
  assertEquals(parseGCharP(""), "");
  assertEquals(parseGCharP(OMITTED), undefined);
});
