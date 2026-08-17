import { assert, assertEquals } from "@std/assert";
import { isValidAddress, isValidCidr } from "./validate.ts";

Deno.test("isValidAddress", async (t) => {
  await t.step("accepts all valid formats", () => {
    assert(isValidAddress("192.168.1.1"));
    assert(isValidAddress("::1"));
    assert(isValidAddress("0.0.0.0"));
    assert(isValidAddress("fe80::1%eth0"));
  });

  await t.step("rejects CIDR notation", () => {
    assertEquals(isValidAddress("10.0.0.0/8"), false);
    assertEquals(isValidAddress("2001:db8::/32"), false);
  });

  await t.step("rejects invalid strings", () => {
    assertEquals(isValidAddress(""), false);
    assertEquals(isValidAddress("not an ip"), false);
    assertEquals(isValidAddress("999.999.999.999"), false);
    assertEquals(isValidAddress("abc/def"), false);
  });
});

Deno.test("isValidCidr", async (t) => {
  await t.step("accepts valid CIDR notation", () => {
    assert(isValidCidr("10.0.0.0/8"));
    assert(isValidCidr("2001:db8::/32"));
    assert(isValidCidr("192.168.1.0/24"));
    assert(isValidCidr("::/0"));
  });

  await t.step("rejects plain IP addresses", () => {
    assertEquals(isValidCidr("192.168.1.1"), false);
    assertEquals(isValidCidr("::1"), false);
  });

  await t.step("rejects invalid strings", () => {
    assertEquals(isValidCidr(""), false);
    assertEquals(isValidCidr("garbage/24"), false);
    assertEquals(isValidCidr("192.168.1.0/33"), false);
  });
});
