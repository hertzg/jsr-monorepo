import { assert, assertEquals } from "@std/assert";
import {
  isValid,
  isValidCidr4,
  isValidCidr6,
  isValidIpv4,
  isValidIpv6,
  validate,
} from "./validate.ts";

Deno.test("isValidIpv4", async (t) => {
  await t.step("valid addresses", () => {
    assert(isValidIpv4("0.0.0.0"));
    assert(isValidIpv4("192.168.1.1"));
    assert(isValidIpv4("255.255.255.255"));
    assert(isValidIpv4("10.0.0.1"));
    assert(isValidIpv4("172.16.0.1"));
  });

  await t.step("invalid addresses", () => {
    assertEquals(isValidIpv4(""), false);
    assertEquals(isValidIpv4("256.0.0.1"), false);
    assertEquals(isValidIpv4("1.2.3"), false);
    assertEquals(isValidIpv4("1.2.3.4.5"), false);
    assertEquals(isValidIpv4("01.02.03.04"), false);
    assertEquals(isValidIpv4("abc"), false);
    assertEquals(isValidIpv4("::1"), false);
    assertEquals(isValidIpv4("192.168.1.0/24"), false);
  });
});

Deno.test("isValidIpv6", async (t) => {
  await t.step("valid addresses", () => {
    assert(isValidIpv6("::"));
    assert(isValidIpv6("::1"));
    assert(isValidIpv6("2001:db8::1"));
    assert(isValidIpv6("fe80::1%eth0"));
    assert(isValidIpv6("::ffff:192.168.1.1"));
    assert(
      isValidIpv6("2001:0db8:0000:0000:0000:0000:0000:0001"),
    );
  });

  await t.step("invalid addresses", () => {
    assertEquals(isValidIpv6(""), false);
    assertEquals(isValidIpv6("192.168.1.1"), false);
    assertEquals(isValidIpv6("2001:db8:::1"), false);
    assertEquals(isValidIpv6("gggg::1"), false);
    assertEquals(isValidIpv6("abc"), false);
    assertEquals(isValidIpv6("2001:db8::/32"), false);
  });
});

Deno.test("isValidCidr4", async (t) => {
  await t.step("valid CIDR", () => {
    assert(isValidCidr4("0.0.0.0/0"));
    assert(isValidCidr4("192.168.1.0/24"));
    assert(isValidCidr4("10.0.0.1/32"));
    assert(isValidCidr4("172.16.0.0/12"));
  });

  await t.step("invalid CIDR", () => {
    assertEquals(isValidCidr4(""), false);
    assertEquals(isValidCidr4("192.168.1.0"), false);
    assertEquals(isValidCidr4("192.168.1.0/33"), false);
    assertEquals(isValidCidr4("192.168.1.0/-1"), false);
    assertEquals(isValidCidr4("2001:db8::/32"), false);
    assertEquals(isValidCidr4("abc/24"), false);
  });
});

Deno.test("isValidCidr6", async (t) => {
  await t.step("valid CIDR", () => {
    assert(isValidCidr6("::/0"));
    assert(isValidCidr6("2001:db8::/32"));
    assert(isValidCidr6("::1/128"));
    assert(isValidCidr6("fe80::/10"));
  });

  await t.step("invalid CIDR", () => {
    assertEquals(isValidCidr6(""), false);
    assertEquals(isValidCidr6("2001:db8::1"), false);
    assertEquals(isValidCidr6("2001:db8::/129"), false);
    assertEquals(isValidCidr6("192.168.1.0/24"), false);
    assertEquals(isValidCidr6("abc/32"), false);
  });
});

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
