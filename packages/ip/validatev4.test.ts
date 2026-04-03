import { assert, assertEquals } from "@std/assert";
import { isValidCidr4, isValidIpv4 } from "./validatev4.ts";

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
