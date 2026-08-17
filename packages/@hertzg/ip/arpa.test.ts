import { assertEquals, assertThrows } from "@std/assert";
import { addressToArpa } from "./arpa.ts";
import { parseAddress } from "./address.ts";

Deno.test("addressToArpa", async (t) => {
  await t.step("dispatches to the IPv4 arm for a number", () => {
    assertEquals(
      addressToArpa(parseAddress("192.168.0.1")),
      "1.0.168.192.in-addr.arpa",
    );
  });

  await t.step("dispatches to the IPv6 arm for a bigint", () => {
    assertEquals(
      addressToArpa(parseAddress("2001:db8::1")),
      "1.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.8.b.d.0.1.0.0.2.ip6.arpa",
    );
  });

  await t.step(
    "sees an IPv4-mapped address as IPv4, since parseAddress does",
    () => {
      assertEquals(
        addressToArpa(parseAddress("::ffff:192.168.0.1")),
        "1.0.168.192.in-addr.arpa",
      );
    },
  );

  await t.step("an address outside its version's range", () => {
    assertThrows(() => addressToArpa(-1), RangeError);
    assertThrows(() => addressToArpa(-1n), RangeError);
  });
});
