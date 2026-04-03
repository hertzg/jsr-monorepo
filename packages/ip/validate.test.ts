import { assert, assertEquals } from "@std/assert";
import { isValidIp, validateIp } from "./validate.ts";

Deno.test("isValidIp", async (t) => {
  await t.step("accepts all valid formats", () => {
    assert(isValidIp("192.168.1.1"));
    assert(isValidIp("::1"));
    assert(isValidIp("10.0.0.0/8"));
    assert(isValidIp("2001:db8::/32"));
    assert(isValidIp("0.0.0.0"));
    assert(isValidIp("fe80::1%eth0"));
  });

  await t.step("rejects invalid strings", () => {
    assertEquals(isValidIp(""), false);
    assertEquals(isValidIp("not an ip"), false);
    assertEquals(isValidIp("999.999.999.999"), false);
    assertEquals(isValidIp("10.0.0.0/33"), false);
    assertEquals(isValidIp("abc/def"), false);
  });
});

Deno.test("validateIp", async (t) => {
  await t.step("identifies IPv4", () => {
    const r = validateIp("192.168.1.1");
    assertEquals(r.kind, "ipv4");
    assert(r.kind === "ipv4");
    assertEquals(r.value, 3232235777);
  });

  await t.step("identifies IPv6", () => {
    const r = validateIp("::1");
    assertEquals(r.kind, "ipv6");
    assert(r.kind === "ipv6");
    assertEquals(r.value, 1n);
  });

  await t.step("identifies IPv6 full form", () => {
    const r = validateIp("2001:0db8:0000:0000:0000:0000:0000:0001");
    assertEquals(r.kind, "ipv6");
  });

  await t.step("identifies IPv4 CIDR", () => {
    const r = validateIp("10.0.0.0/8");
    assertEquals(r.kind, "cidr4");
    assert(r.kind === "cidr4");
    assertEquals(r.value.prefixLength, 8);
  });

  await t.step("identifies IPv6 CIDR", () => {
    const r = validateIp("2001:db8::/32");
    assertEquals(r.kind, "cidr6");
    assert(r.kind === "cidr6");
    assertEquals(r.value.prefixLength, 32);
  });

  await t.step("returns invalid for garbage", () => {
    assertEquals(validateIp("").kind, "invalid");
    assertEquals(validateIp("not an ip").kind, "invalid");
    assertEquals(validateIp("abc").kind, "invalid");
    assertEquals(validateIp("999.999.999.999").kind, "invalid");
  });

  await t.step("returns invalid for malformed CIDR", () => {
    assertEquals(validateIp("192.168.1.0/33").kind, "invalid");
    assertEquals(validateIp("abc/def").kind, "invalid");
  });

  await t.step("prefers cidr4 over cidr6 for slash strings", () => {
    const r = validateIp("10.0.0.0/8");
    assertEquals(r.kind, "cidr4");
  });

  await t.step("falls back to cidr6 when cidr4 fails", () => {
    const r = validateIp("2001:db8::/32");
    assertEquals(r.kind, "cidr6");
  });
});
