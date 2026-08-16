import { assertEquals, assertThrows } from "@std/assert";
import { ipToArpa } from "./arpa.ts";
import { parseIp } from "./ip.ts";

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

  await t.step("an address outside its version's range", () => {
    assertThrows(() => ipToArpa(-1), RangeError);
    assertThrows(() => ipToArpa(-1n), RangeError);
  });
});
