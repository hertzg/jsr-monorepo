import { assertEquals, assertFalse } from "@std/assert";
import { ipToArpa, ipv4ToArpa, ipv6ToArpa } from "./arpa.ts";
import { parseIp } from "./ip.ts";
import { parseIpv4 } from "./ipv4.ts";
import { parseIpv6 } from "./ipv6.ts";

Deno.test("ipv4ToArpa", async (t) => {
  await t.step("reverses the four octets under in-addr.arpa", () => {
    assertEquals(
      ipv4ToArpa(parseIpv4("192.168.0.1")),
      "1.0.168.192.in-addr.arpa",
    );
    assertEquals(ipv4ToArpa(parseIpv4("8.8.8.8")), "8.8.8.8.in-addr.arpa");
  });

  await t.step("all-zero address", () => {
    assertEquals(ipv4ToArpa(parseIpv4("0.0.0.0")), "0.0.0.0.in-addr.arpa");
  });

  await t.step("all-ff address", () => {
    assertEquals(
      ipv4ToArpa(parseIpv4("255.255.255.255")),
      "255.255.255.255.in-addr.arpa",
    );
  });

  await t.step("the name is relative -- no trailing dot", () => {
    assertFalse(ipv4ToArpa(parseIpv4("192.168.0.1")).endsWith("."));
  });
});

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

  await t.step("leading zeros in a group are nibbles, not elided", () => {
    assertEquals(
      ipv6ToArpa(parseIpv6("2001:0db8:0000:0000:0000:0000:0000:0001")),
      ipv6ToArpa(parseIpv6("2001:db8::1")),
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
});

Deno.test("ipToArpa", async (t) => {
  await t.step("dispatches to the IPv4 arm for a number", () => {
    assertEquals(
      ipToArpa(parseIp("192.168.0.1")),
      "1.0.168.192.in-addr.arpa",
    );
  });

  await t.step("dispatches to the IPv6 arm for a bigint", () => {
    assertEquals(
      ipToArpa(parseIp("2001:db8::1")),
      "1.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.8.b.d.0.1.0.0.2.ip6.arpa",
    );
  });

  await t.step(
    "sees an IPv4-mapped address as IPv4, since parseIp does",
    () => {
      assertEquals(
        ipToArpa(parseIp("::ffff:192.168.0.1")),
        "1.0.168.192.in-addr.arpa",
      );
    },
  );

  await t.step("the name is relative -- no trailing dot", () => {
    assertFalse(ipToArpa(parseIp("2001:db8::1")).endsWith("."));
  });
});
