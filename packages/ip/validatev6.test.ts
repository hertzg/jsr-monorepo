import { assert, assertEquals } from "@std/assert";
import { isValidCidr6, isValidIpv6 } from "./validatev6.ts";

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
