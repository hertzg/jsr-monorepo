import { assertEquals, assertFalse, assertThrows } from "@std/assert";
import { ipv6ToArpa } from "./arpav6.ts";
import { parseIpv6 } from "./ipv6.ts";

Deno.test("ipv6ToArpa", async (t) => {
  await t.step("reverses all 32 nibbles under ip6.arpa", () => {
    assertEquals(
      ipv6ToArpa(parseIpv6("2001:db8::1")),
      "1.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.8.b.d.0.1.0.0.2.ip6.arpa",
    );
    assertEquals(
      ipv6ToArpa(parseIpv6("fe80::1")),
      "1.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.8.e.f.ip6.arpa",
    );
  });

  await t.step("all-zero address", () => {
    assertEquals(
      ipv6ToArpa(parseIpv6("::")),
      "0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.ip6.arpa",
    );
  });

  await t.step("all-ff address", () => {
    assertEquals(
      ipv6ToArpa(parseIpv6("ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff")),
      "f.f.f.f.f.f.f.f.f.f.f.f.f.f.f.f.f.f.f.f.f.f.f.f.f.f.f.f.f.f.f.f.ip6.arpa",
    );
  });

  await t.step("an IPv4-mapped address held as a bigint", () => {
    assertEquals(
      ipv6ToArpa(parseIpv6("::ffff:192.168.0.1")),
      "1.0.0.0.8.a.0.c.f.f.f.f.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.ip6.arpa",
    );
  });

  await t.step("the name is relative -- no trailing dot", () => {
    assertFalse(ipv6ToArpa(parseIpv6("2001:db8::1")).endsWith("."));
  });

  await t.step("an address outside the IPv6 range", () => {
    const MAX_IPV6 = 340282366920938463463374607431768211455n;

    assertThrows(() => ipv6ToArpa(-1n), RangeError);
    assertThrows(() => ipv6ToArpa(MAX_IPV6 + 1n), RangeError);
  });
});
