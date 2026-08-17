import { assert, assertEquals } from "@std/assert";
import { parseAddressv6 } from "./addressv6.ts";
import {
  classifyAddressv6,
  isAddressv6Benchmarking,
  isAddressv6Documentation,
  isAddressv6GlobalUnicast,
  isAddressv6LinkLocal,
  isAddressv6Loopback,
  isAddressv6Mapped,
  isAddressv6Multicast,
  isAddressv6Orchidv2,
  isAddressv6Teredo,
  isAddressv6Translated,
  isAddressv6UniqueLocal,
  isAddressv6Unspecified,
} from "./classifyv6.ts";

Deno.test("isAddressv6Loopback", async (t) => {
  await t.step("matches ::1", () => {
    assert(isAddressv6Loopback(parseAddressv6("::1").address));
  });

  await t.step("rejects non-loopback", () => {
    assertEquals(isAddressv6Loopback(parseAddressv6("::").address), false);
    assertEquals(isAddressv6Loopback(parseAddressv6("::2").address), false);
    assertEquals(
      isAddressv6Loopback(parseAddressv6("2001:db8::1").address),
      false,
    );
  });
});

Deno.test("isAddressv6Unspecified", async (t) => {
  await t.step("matches ::", () => {
    assert(isAddressv6Unspecified(parseAddressv6("::").address));
  });

  await t.step("rejects non-unspecified", () => {
    assertEquals(isAddressv6Unspecified(parseAddressv6("::1").address), false);
    assertEquals(
      isAddressv6Unspecified(parseAddressv6("2001:db8::1").address),
      false,
    );
  });
});

Deno.test("isAddressv6LinkLocal", async (t) => {
  await t.step("matches fe80::/10", () => {
    assert(isAddressv6LinkLocal(parseAddressv6("fe80::").address));
    assert(isAddressv6LinkLocal(parseAddressv6("fe80::1").address));
    assert(
      isAddressv6LinkLocal(
        parseAddressv6("febf:ffff:ffff:ffff:ffff:ffff:ffff:ffff").address,
      ),
    );
  });

  await t.step("rejects non-link-local", () => {
    assertEquals(isAddressv6LinkLocal(parseAddressv6("fe7f::").address), false);
    assertEquals(isAddressv6LinkLocal(parseAddressv6("fec0::").address), false);
  });
});

Deno.test("isAddressv6Multicast", async (t) => {
  await t.step("matches ff00::/8", () => {
    assert(isAddressv6Multicast(parseAddressv6("ff00::").address));
    assert(isAddressv6Multicast(parseAddressv6("ff02::1").address));
    assert(
      isAddressv6Multicast(
        parseAddressv6("ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff").address,
      ),
    );
  });

  await t.step("rejects non-multicast", () => {
    assertEquals(isAddressv6Multicast(parseAddressv6("feff::").address), false);
    assertEquals(
      isAddressv6Multicast(parseAddressv6("fe80::1").address),
      false,
    );
  });
});

Deno.test("isAddressv6UniqueLocal", async (t) => {
  await t.step("matches fc00::/7", () => {
    assert(isAddressv6UniqueLocal(parseAddressv6("fc00::").address));
    assert(isAddressv6UniqueLocal(parseAddressv6("fc00::1").address));
    assert(isAddressv6UniqueLocal(parseAddressv6("fd00::1").address));
    assert(
      isAddressv6UniqueLocal(
        parseAddressv6("fdff:ffff:ffff:ffff:ffff:ffff:ffff:ffff").address,
      ),
    );
  });

  await t.step("rejects non-unique-local", () => {
    assertEquals(
      isAddressv6UniqueLocal(parseAddressv6("fbff::").address),
      false,
    );
    assertEquals(
      isAddressv6UniqueLocal(parseAddressv6("fe00::").address),
      false,
    );
  });
});

Deno.test("isAddressv6GlobalUnicast", async (t) => {
  await t.step("matches 2000::/3", () => {
    assert(isAddressv6GlobalUnicast(parseAddressv6("2000::").address));
    assert(isAddressv6GlobalUnicast(parseAddressv6("2001:db8::1").address));
    assert(
      isAddressv6GlobalUnicast(
        parseAddressv6("2607:f8b0:4004:800::200e").address,
      ),
    );
    assert(
      isAddressv6GlobalUnicast(
        parseAddressv6("3fff:ffff:ffff:ffff:ffff:ffff:ffff:ffff").address,
      ),
    );
  });

  await t.step("rejects non-global-unicast", () => {
    assertEquals(
      isAddressv6GlobalUnicast(parseAddressv6("1fff::").address),
      false,
    );
    assertEquals(
      isAddressv6GlobalUnicast(parseAddressv6("4000::").address),
      false,
    );
    assertEquals(
      isAddressv6GlobalUnicast(parseAddressv6("fe80::1").address),
      false,
    );
  });
});

Deno.test("isAddressv6Mapped", async (t) => {
  await t.step("matches ::ffff:0:0/96", () => {
    assert(isAddressv6Mapped(parseAddressv6("::ffff:0.0.0.0").address));
    assert(isAddressv6Mapped(parseAddressv6("::ffff:192.168.1.1").address));
    assert(isAddressv6Mapped(parseAddressv6("::ffff:255.255.255.255").address));
    assert(isAddressv6Mapped(parseAddressv6("::ffff:c0a8:101").address));
  });

  await t.step("rejects non-ipv4-mapped", () => {
    assertEquals(isAddressv6Mapped(parseAddressv6("::1").address), false);
    assertEquals(
      isAddressv6Mapped(parseAddressv6("::fffe:c0a8:101").address),
      false,
    );
  });
});

Deno.test("isAddressv6Translated", async (t) => {
  await t.step("matches 64:ff9b::/96", () => {
    assert(isAddressv6Translated(parseAddressv6("64:ff9b::").address));
    assert(isAddressv6Translated(parseAddressv6("64:ff9b::1").address));
    assert(isAddressv6Translated(parseAddressv6("64:ff9b::ffff:ffff").address));
  });

  await t.step("rejects non-ipv4-translated", () => {
    assertEquals(
      isAddressv6Translated(parseAddressv6("64:ff9a::").address),
      false,
    );
    assertEquals(
      isAddressv6Translated(parseAddressv6("65:ff9b::").address),
      false,
    );
  });
});

Deno.test("isAddressv6Documentation", async (t) => {
  await t.step("matches 2001:db8::/32", () => {
    assert(isAddressv6Documentation(parseAddressv6("2001:db8::").address));
    assert(isAddressv6Documentation(parseAddressv6("2001:db8::1").address));
    assert(
      isAddressv6Documentation(
        parseAddressv6("2001:db8:ffff:ffff:ffff:ffff:ffff:ffff").address,
      ),
    );
  });

  await t.step("rejects non-documentation", () => {
    assertEquals(
      isAddressv6Documentation(parseAddressv6("2001:db7::").address),
      false,
    );
    assertEquals(
      isAddressv6Documentation(parseAddressv6("2001:db9::").address),
      false,
    );
  });
});

Deno.test("isAddressv6Teredo", async (t) => {
  await t.step("matches 2001::/32", () => {
    assert(isAddressv6Teredo(parseAddressv6("2001::").address));
    assert(isAddressv6Teredo(parseAddressv6("2001::1").address));
    assert(
      isAddressv6Teredo(
        parseAddressv6("2001:0:ffff:ffff:ffff:ffff:ffff:ffff").address,
      ),
    );
  });

  await t.step("rejects non-teredo", () => {
    assertEquals(
      isAddressv6Teredo(parseAddressv6("2000:ffff::").address),
      false,
    );
    assertEquals(isAddressv6Teredo(parseAddressv6("2002::").address), false);
  });
});

Deno.test("isAddressv6Benchmarking", async (t) => {
  await t.step("matches 2001:2::/48", () => {
    assert(isAddressv6Benchmarking(parseAddressv6("2001:2::").address));
    assert(isAddressv6Benchmarking(parseAddressv6("2001:2::1").address));
    assert(
      isAddressv6Benchmarking(
        parseAddressv6("2001:2:0:ffff:ffff:ffff:ffff:ffff").address,
      ),
    );
  });

  await t.step("rejects non-benchmarking", () => {
    assertEquals(
      isAddressv6Benchmarking(parseAddressv6("2001:1:ffff::").address),
      false,
    );
    assertEquals(
      isAddressv6Benchmarking(parseAddressv6("2001:3::").address),
      false,
    );
  });
});

Deno.test("isAddressv6Orchidv2", async (t) => {
  await t.step("matches 2001:20::/28", () => {
    assert(isAddressv6Orchidv2(parseAddressv6("2001:20::").address));
    assert(isAddressv6Orchidv2(parseAddressv6("2001:20::1").address));
    assert(
      isAddressv6Orchidv2(
        parseAddressv6("2001:2f:ffff:ffff:ffff:ffff:ffff:ffff").address,
      ),
    );
  });

  await t.step("rejects non-orchidv2", () => {
    assertEquals(
      isAddressv6Orchidv2(parseAddressv6("2001:1f:ffff::").address),
      false,
    );
    assertEquals(
      isAddressv6Orchidv2(parseAddressv6("2001:30::").address),
      false,
    );
  });
});

Deno.test("classifyAddressv6", async (t) => {
  await t.step("classifies all range types", () => {
    assertEquals(classifyAddressv6(parseAddressv6("::1").address), "loopback");
    assertEquals(
      classifyAddressv6(parseAddressv6("::").address),
      "unspecified",
    );
    assertEquals(
      classifyAddressv6(parseAddressv6("::ffff:192.168.1.1").address),
      "ipv4-mapped",
    );
    assertEquals(
      classifyAddressv6(parseAddressv6("64:ff9b::1").address),
      "ipv4-translated",
    );
    assertEquals(
      classifyAddressv6(parseAddressv6("2001:db8::1").address),
      "documentation",
    );
    assertEquals(
      classifyAddressv6(parseAddressv6("2001:2::1").address),
      "benchmarking",
    );
    assertEquals(
      classifyAddressv6(parseAddressv6("2001:20::1").address),
      "orchidv2",
    );
    assertEquals(
      classifyAddressv6(parseAddressv6("2001::1").address),
      "teredo",
    );
    assertEquals(
      classifyAddressv6(parseAddressv6("fe80::1").address),
      "link-local",
    );
    assertEquals(
      classifyAddressv6(parseAddressv6("ff02::1").address),
      "multicast",
    );
    assertEquals(
      classifyAddressv6(parseAddressv6("fd00::1").address),
      "unique-local",
    );
    assertEquals(
      classifyAddressv6(parseAddressv6("2607:f8b0:4004:800::200e").address),
      "global-unicast",
    );
  });

  await t.step("returns unassigned for unknown ranges", () => {
    assertEquals(
      classifyAddressv6(parseAddressv6("100::").address),
      "unassigned",
    );
    assertEquals(
      classifyAddressv6(parseAddressv6("4000::").address),
      "unassigned",
    );
  });

  await t.step("most specific wins for overlapping ranges", () => {
    // 2001:db8::/32 is documentation, not just teredo or global-unicast
    assertEquals(
      classifyAddressv6(parseAddressv6("2001:db8::1").address),
      "documentation",
    );
    // 2001:2::/48 is benchmarking, not just teredo
    assertEquals(
      classifyAddressv6(parseAddressv6("2001:2::1").address),
      "benchmarking",
    );
    // 2001:20::/28 is orchidv2, not just teredo
    assertEquals(
      classifyAddressv6(parseAddressv6("2001:20::1").address),
      "orchidv2",
    );
    // plain 2001::/32 is teredo when not in a more specific sub-range
    assertEquals(
      classifyAddressv6(parseAddressv6("2001::1").address),
      "teredo",
    );
  });
});
