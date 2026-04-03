import { assert, assertEquals } from "@std/assert";
import { isValid, validate } from "./validate.ts";

Deno.test("isValid", async (t) => {
  await t.step("accepts all valid formats", () => {
    assert(isValid("192.168.1.1"));
    assert(isValid("::1"));
    assert(isValid("10.0.0.0/8"));
    assert(isValid("2001:db8::/32"));
    assert(isValid("0.0.0.0"));
    assert(isValid("fe80::1%eth0"));
  });

  await t.step("rejects invalid strings", () => {
    assertEquals(isValid(""), false);
    assertEquals(isValid("not an ip"), false);
    assertEquals(isValid("999.999.999.999"), false);
    assertEquals(isValid("10.0.0.0/33"), false);
    assertEquals(isValid("abc/def"), false);
  });
});

Deno.test("validate", async (t) => {
  await t.step("identifies IPv4", () => {
    const r = validate("192.168.1.1");
    assertEquals(r.kind, "ipv4");
    assert(r.kind === "ipv4");
    assertEquals(r.value, 3232235777);
  });

  await t.step("identifies IPv6", () => {
    const r = validate("::1");
    assertEquals(r.kind, "ipv6");
    assert(r.kind === "ipv6");
    assertEquals(r.value, 1n);
  });

  await t.step("identifies IPv6 full form", () => {
    const r = validate("2001:0db8:0000:0000:0000:0000:0000:0001");
    assertEquals(r.kind, "ipv6");
  });

  await t.step("identifies IPv4 CIDR", () => {
    const r = validate("10.0.0.0/8");
    assertEquals(r.kind, "cidr4");
    assert(r.kind === "cidr4");
    assertEquals(r.value.prefixLength, 8);
  });

  await t.step("identifies IPv6 CIDR", () => {
    const r = validate("2001:db8::/32");
    assertEquals(r.kind, "cidr6");
    assert(r.kind === "cidr6");
    assertEquals(r.value.prefixLength, 32);
  });

  await t.step("returns invalid for garbage", () => {
    assertEquals(validate("").kind, "invalid");
    assertEquals(validate("not an ip").kind, "invalid");
    assertEquals(validate("abc").kind, "invalid");
    assertEquals(validate("999.999.999.999").kind, "invalid");
  });

  await t.step("returns invalid for malformed CIDR", () => {
    assertEquals(validate("192.168.1.0/33").kind, "invalid");
    assertEquals(validate("abc/def").kind, "invalid");
  });

  await t.step("prefers cidr4 over cidr6 for slash strings", () => {
    const r = validate("10.0.0.0/8");
    assertEquals(r.kind, "cidr4");
  });

  await t.step("falls back to cidr6 when cidr4 fails", () => {
    const r = validate("2001:db8::/32");
    assertEquals(r.kind, "cidr6");
  });
});
