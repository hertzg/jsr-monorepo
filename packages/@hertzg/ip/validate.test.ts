import { assert, assertEquals } from "@std/assert";
import { isValidAddress, isValidCidr } from "./validate.ts";

Deno.test("isValidAddress", async (t) => {
  await t.step("accepts all valid formats", () => {
    assert(isValidAddress("192.168.1.1"));
    assert(isValidAddress("::1"));
    assert(isValidAddress("0.0.0.0"));
    assert(isValidAddress("fe80::1%eth0"));
    assert(isValidAddress("192.168.1.1%ether1"));
  });

  await t.step("follows the parser on zone IDs", () => {
    assertEquals(isValidAddress("fe80::1%"), false);
    assertEquals(isValidAddress("fe80::1%eth0%1"), false);
    assertEquals(isValidAddress("fe80::1% eth0"), false);
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

  await t.step(
    "accepts the mask dialect and zone IDs, as the parsers do",
    () => {
      assert(isValidCidr("10.0.0.0/255.0.0.0"));
      assert(isValidCidr("fe80::/ffff:ffff::"));
      assert(isValidCidr("fe80::%ether1/64"));
      assertEquals(isValidCidr("10.0.0.0/ffff:ff00::"), false);
      assertEquals(isValidCidr("fe80::/64%eth0"), false);
    },
  );

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
