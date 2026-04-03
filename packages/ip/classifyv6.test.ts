import { assert, assertEquals } from "@std/assert";
import { parseIpv6 } from "./ipv6.ts";
import {
  classifyIpv6,
  isIpv6Benchmarking,
  isIpv6Documentation,
  isIpv6GlobalUnicast,
  isIpv6Ipv4Mapped,
  isIpv6Ipv4Translated,
  isIpv6LinkLocal,
  isIpv6Loopback,
  isIpv6Multicast,
  isIpv6Orchidv2,
  isIpv6Teredo,
  isIpv6Unspecified,
  isIpv6UniqueLocal,
} from "./classifyv6.ts";

Deno.test("isIpv6Loopback", async (t) => {
  await t.step("matches ::1", () => {
    assert(isIpv6Loopback(parseIpv6("::1")));
  });

  await t.step("rejects non-loopback", () => {
    assertEquals(isIpv6Loopback(parseIpv6("::")), false);
    assertEquals(isIpv6Loopback(parseIpv6("::2")), false);
    assertEquals(isIpv6Loopback(parseIpv6("2001:db8::1")), false);
  });
});

Deno.test("isIpv6Unspecified", async (t) => {
  await t.step("matches ::", () => {
    assert(isIpv6Unspecified(parseIpv6("::")));
  });

  await t.step("rejects non-unspecified", () => {
    assertEquals(isIpv6Unspecified(parseIpv6("::1")), false);
    assertEquals(isIpv6Unspecified(parseIpv6("2001:db8::1")), false);
  });
});

Deno.test("isIpv6LinkLocal", async (t) => {
  await t.step("matches fe80::/10", () => {
    assert(isIpv6LinkLocal(parseIpv6("fe80::")));
    assert(isIpv6LinkLocal(parseIpv6("fe80::1")));
    assert(isIpv6LinkLocal(parseIpv6("febf:ffff:ffff:ffff:ffff:ffff:ffff:ffff")));
  });

  await t.step("rejects non-link-local", () => {
    assertEquals(isIpv6LinkLocal(parseIpv6("fe7f::")), false);
    assertEquals(isIpv6LinkLocal(parseIpv6("fec0::")), false);
  });
});

Deno.test("isIpv6Multicast", async (t) => {
  await t.step("matches ff00::/8", () => {
    assert(isIpv6Multicast(parseIpv6("ff00::")));
    assert(isIpv6Multicast(parseIpv6("ff02::1")));
    assert(isIpv6Multicast(parseIpv6("ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff")));
  });

  await t.step("rejects non-multicast", () => {
    assertEquals(isIpv6Multicast(parseIpv6("feff::")), false);
    assertEquals(isIpv6Multicast(parseIpv6("fe80::1")), false);
  });
});

Deno.test("isIpv6UniqueLocal", async (t) => {
  await t.step("matches fc00::/7", () => {
    assert(isIpv6UniqueLocal(parseIpv6("fc00::")));
    assert(isIpv6UniqueLocal(parseIpv6("fc00::1")));
    assert(isIpv6UniqueLocal(parseIpv6("fd00::1")));
    assert(isIpv6UniqueLocal(parseIpv6("fdff:ffff:ffff:ffff:ffff:ffff:ffff:ffff")));
  });

  await t.step("rejects non-unique-local", () => {
    assertEquals(isIpv6UniqueLocal(parseIpv6("fbff::")), false);
    assertEquals(isIpv6UniqueLocal(parseIpv6("fe00::")), false);
  });
});

Deno.test("isIpv6GlobalUnicast", async (t) => {
  await t.step("matches 2000::/3", () => {
    assert(isIpv6GlobalUnicast(parseIpv6("2000::")));
    assert(isIpv6GlobalUnicast(parseIpv6("2001:db8::1")));
    assert(isIpv6GlobalUnicast(parseIpv6("2607:f8b0:4004:800::200e")));
    assert(isIpv6GlobalUnicast(parseIpv6("3fff:ffff:ffff:ffff:ffff:ffff:ffff:ffff")));
  });

  await t.step("rejects non-global-unicast", () => {
    assertEquals(isIpv6GlobalUnicast(parseIpv6("1fff::")), false);
    assertEquals(isIpv6GlobalUnicast(parseIpv6("4000::")), false);
    assertEquals(isIpv6GlobalUnicast(parseIpv6("fe80::1")), false);
  });
});

Deno.test("isIpv6Ipv4Mapped", async (t) => {
  await t.step("matches ::ffff:0:0/96", () => {
    assert(isIpv6Ipv4Mapped(parseIpv6("::ffff:0.0.0.0")));
    assert(isIpv6Ipv4Mapped(parseIpv6("::ffff:192.168.1.1")));
    assert(isIpv6Ipv4Mapped(parseIpv6("::ffff:255.255.255.255")));
    assert(isIpv6Ipv4Mapped(parseIpv6("::ffff:c0a8:101")));
  });

  await t.step("rejects non-ipv4-mapped", () => {
    assertEquals(isIpv6Ipv4Mapped(parseIpv6("::1")), false);
    assertEquals(isIpv6Ipv4Mapped(parseIpv6("::fffe:c0a8:101")), false);
  });
});

Deno.test("isIpv6Ipv4Translated", async (t) => {
  await t.step("matches 64:ff9b::/96", () => {
    assert(isIpv6Ipv4Translated(parseIpv6("64:ff9b::")));
    assert(isIpv6Ipv4Translated(parseIpv6("64:ff9b::1")));
    assert(isIpv6Ipv4Translated(parseIpv6("64:ff9b::ffff:ffff")));
  });

  await t.step("rejects non-ipv4-translated", () => {
    assertEquals(isIpv6Ipv4Translated(parseIpv6("64:ff9a::")), false);
    assertEquals(isIpv6Ipv4Translated(parseIpv6("65:ff9b::")), false);
  });
});

Deno.test("isIpv6Documentation", async (t) => {
  await t.step("matches 2001:db8::/32", () => {
    assert(isIpv6Documentation(parseIpv6("2001:db8::")));
    assert(isIpv6Documentation(parseIpv6("2001:db8::1")));
    assert(isIpv6Documentation(parseIpv6("2001:db8:ffff:ffff:ffff:ffff:ffff:ffff")));
  });

  await t.step("rejects non-documentation", () => {
    assertEquals(isIpv6Documentation(parseIpv6("2001:db7::")), false);
    assertEquals(isIpv6Documentation(parseIpv6("2001:db9::")), false);
  });
});

Deno.test("isIpv6Teredo", async (t) => {
  await t.step("matches 2001::/32", () => {
    assert(isIpv6Teredo(parseIpv6("2001::")));
    assert(isIpv6Teredo(parseIpv6("2001::1")));
    assert(isIpv6Teredo(parseIpv6("2001:0:ffff:ffff:ffff:ffff:ffff:ffff")));
  });

  await t.step("rejects non-teredo", () => {
    assertEquals(isIpv6Teredo(parseIpv6("2000:ffff::")), false);
    assertEquals(isIpv6Teredo(parseIpv6("2002::")), false);
  });
});

Deno.test("isIpv6Benchmarking", async (t) => {
  await t.step("matches 2001:2::/48", () => {
    assert(isIpv6Benchmarking(parseIpv6("2001:2::")));
    assert(isIpv6Benchmarking(parseIpv6("2001:2::1")));
    assert(isIpv6Benchmarking(parseIpv6("2001:2:0:ffff:ffff:ffff:ffff:ffff")));
  });

  await t.step("rejects non-benchmarking", () => {
    assertEquals(isIpv6Benchmarking(parseIpv6("2001:1:ffff::")), false);
    assertEquals(isIpv6Benchmarking(parseIpv6("2001:3::")), false);
  });
});

Deno.test("isIpv6Orchidv2", async (t) => {
  await t.step("matches 2001:20::/28", () => {
    assert(isIpv6Orchidv2(parseIpv6("2001:20::")));
    assert(isIpv6Orchidv2(parseIpv6("2001:20::1")));
    assert(isIpv6Orchidv2(parseIpv6("2001:2f:ffff:ffff:ffff:ffff:ffff:ffff")));
  });

  await t.step("rejects non-orchidv2", () => {
    assertEquals(isIpv6Orchidv2(parseIpv6("2001:1f:ffff::")), false);
    assertEquals(isIpv6Orchidv2(parseIpv6("2001:30::")), false);
  });
});

Deno.test("classifyIpv6", async (t) => {
  await t.step("classifies all range types", () => {
    assertEquals(classifyIpv6(parseIpv6("::1")), "loopback");
    assertEquals(classifyIpv6(parseIpv6("::")), "unspecified");
    assertEquals(classifyIpv6(parseIpv6("::ffff:192.168.1.1")), "ipv4-mapped");
    assertEquals(classifyIpv6(parseIpv6("64:ff9b::1")), "ipv4-translated");
    assertEquals(classifyIpv6(parseIpv6("2001:db8::1")), "documentation");
    assertEquals(classifyIpv6(parseIpv6("2001:2::1")), "benchmarking");
    assertEquals(classifyIpv6(parseIpv6("2001:20::1")), "orchidv2");
    assertEquals(classifyIpv6(parseIpv6("2001::1")), "teredo");
    assertEquals(classifyIpv6(parseIpv6("fe80::1")), "link-local");
    assertEquals(classifyIpv6(parseIpv6("ff02::1")), "multicast");
    assertEquals(classifyIpv6(parseIpv6("fd00::1")), "unique-local");
    assertEquals(classifyIpv6(parseIpv6("2607:f8b0:4004:800::200e")), "global-unicast");
  });

  await t.step("returns unassigned for unknown ranges", () => {
    assertEquals(classifyIpv6(parseIpv6("100::")), "unassigned");
    assertEquals(classifyIpv6(parseIpv6("4000::")), "unassigned");
  });

  await t.step("most specific wins for overlapping ranges", () => {
    // 2001:db8::/32 is documentation, not just teredo or global-unicast
    assertEquals(classifyIpv6(parseIpv6("2001:db8::1")), "documentation");
    // 2001:2::/48 is benchmarking, not just teredo
    assertEquals(classifyIpv6(parseIpv6("2001:2::1")), "benchmarking");
    // 2001:20::/28 is orchidv2, not just teredo
    assertEquals(classifyIpv6(parseIpv6("2001:20::1")), "orchidv2");
    // plain 2001::/32 is teredo when not in a more specific sub-range
    assertEquals(classifyIpv6(parseIpv6("2001::1")), "teredo");
  });
});
