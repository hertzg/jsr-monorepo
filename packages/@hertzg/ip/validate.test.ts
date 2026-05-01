import { assert, assertEquals } from "@std/assert";
import { isValidCidr, isValidIp } from "./validate.ts";

Deno.test("isValidIp", async (t) => {
  await t.step("accepts all valid formats", () => {
    assert(isValidIp("192.168.1.1"));
    assert(isValidIp("::1"));
    assert(isValidIp("0.0.0.0"));
    assert(isValidIp("fe80::1%eth0"));
  });

  await t.step("rejects CIDR notation", () => {
    assertEquals(isValidIp("10.0.0.0/8"), false);
    assertEquals(isValidIp("2001:db8::/32"), false);
  });

  await t.step("rejects invalid strings", () => {
    assertEquals(isValidIp(""), false);
    assertEquals(isValidIp("not an ip"), false);
    assertEquals(isValidIp("999.999.999.999"), false);
    assertEquals(isValidIp("abc/def"), false);
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
