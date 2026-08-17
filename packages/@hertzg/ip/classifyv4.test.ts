import { assert, assertEquals } from "@std/assert";
import { parseAddressv4 } from "./addressv4.ts";
import {
  classifyAddressv4,
  isAddressv4Benchmarking,
  isAddressv4Broadcast,
  isAddressv4CgNat,
  isAddressv4Documentation,
  isAddressv4LinkLocal,
  isAddressv4Loopback,
  isAddressv4Multicast,
  isAddressv4Private,
  isAddressv4Public,
  isAddressv4Reserved,
  isAddressv4ThisNetwork,
} from "./classifyv4.ts";

Deno.test("isAddressv4Private", async (t) => {
  await t.step("matches 10.0.0.0/8", () => {
    assert(isAddressv4Private(parseAddressv4("10.0.0.0")));
    assert(isAddressv4Private(parseAddressv4("10.0.0.1")));
    assert(isAddressv4Private(parseAddressv4("10.255.255.255")));
  });

  await t.step("matches 172.16.0.0/12", () => {
    assert(isAddressv4Private(parseAddressv4("172.16.0.0")));
    assert(isAddressv4Private(parseAddressv4("172.16.0.1")));
    assert(isAddressv4Private(parseAddressv4("172.31.255.255")));
  });

  await t.step("matches 192.168.0.0/16", () => {
    assert(isAddressv4Private(parseAddressv4("192.168.0.0")));
    assert(isAddressv4Private(parseAddressv4("192.168.1.1")));
    assert(isAddressv4Private(parseAddressv4("192.168.255.255")));
  });

  await t.step("rejects non-private", () => {
    assertEquals(isAddressv4Private(parseAddressv4("9.255.255.255")), false);
    assertEquals(isAddressv4Private(parseAddressv4("11.0.0.0")), false);
    assertEquals(isAddressv4Private(parseAddressv4("172.15.255.255")), false);
    assertEquals(isAddressv4Private(parseAddressv4("172.32.0.0")), false);
    assertEquals(isAddressv4Private(parseAddressv4("192.167.255.255")), false);
    assertEquals(isAddressv4Private(parseAddressv4("192.169.0.0")), false);
    assertEquals(isAddressv4Private(parseAddressv4("8.8.8.8")), false);
  });
});

Deno.test("isAddressv4Loopback", async (t) => {
  await t.step("matches 127.0.0.0/8", () => {
    assert(isAddressv4Loopback(parseAddressv4("127.0.0.0")));
    assert(isAddressv4Loopback(parseAddressv4("127.0.0.1")));
    assert(isAddressv4Loopback(parseAddressv4("127.255.255.255")));
  });

  await t.step("rejects non-loopback", () => {
    assertEquals(isAddressv4Loopback(parseAddressv4("126.255.255.255")), false);
    assertEquals(isAddressv4Loopback(parseAddressv4("128.0.0.0")), false);
  });
});

Deno.test("isAddressv4LinkLocal", async (t) => {
  await t.step("matches 169.254.0.0/16", () => {
    assert(isAddressv4LinkLocal(parseAddressv4("169.254.0.0")));
    assert(isAddressv4LinkLocal(parseAddressv4("169.254.1.1")));
    assert(isAddressv4LinkLocal(parseAddressv4("169.254.255.255")));
  });

  await t.step("rejects non-link-local", () => {
    assertEquals(
      isAddressv4LinkLocal(parseAddressv4("169.253.255.255")),
      false,
    );
    assertEquals(isAddressv4LinkLocal(parseAddressv4("169.255.0.0")), false);
  });
});

Deno.test("isAddressv4Multicast", async (t) => {
  await t.step("matches 224.0.0.0/4", () => {
    assert(isAddressv4Multicast(parseAddressv4("224.0.0.0")));
    assert(isAddressv4Multicast(parseAddressv4("224.0.0.1")));
    assert(isAddressv4Multicast(parseAddressv4("230.1.2.3")));
    assert(isAddressv4Multicast(parseAddressv4("239.255.255.255")));
  });

  await t.step("rejects non-multicast", () => {
    assertEquals(
      isAddressv4Multicast(parseAddressv4("223.255.255.255")),
      false,
    );
    assertEquals(isAddressv4Multicast(parseAddressv4("240.0.0.0")), false);
  });
});

Deno.test("isAddressv4Reserved", async (t) => {
  await t.step("matches 240.0.0.0/4 excluding broadcast", () => {
    assert(isAddressv4Reserved(parseAddressv4("240.0.0.0")));
    assert(isAddressv4Reserved(parseAddressv4("250.1.2.3")));
    assert(isAddressv4Reserved(parseAddressv4("255.255.255.254")));
  });

  await t.step("excludes broadcast", () => {
    assertEquals(isAddressv4Reserved(parseAddressv4("255.255.255.255")), false);
  });

  await t.step("rejects non-reserved", () => {
    assertEquals(isAddressv4Reserved(parseAddressv4("239.255.255.255")), false);
    assertEquals(isAddressv4Reserved(parseAddressv4("8.8.8.8")), false);
  });
});

Deno.test("isAddressv4Broadcast", async (t) => {
  await t.step("matches 255.255.255.255", () => {
    assert(isAddressv4Broadcast(parseAddressv4("255.255.255.255")));
  });

  await t.step("rejects non-broadcast", () => {
    assertEquals(
      isAddressv4Broadcast(parseAddressv4("255.255.255.254")),
      false,
    );
    assertEquals(isAddressv4Broadcast(parseAddressv4("0.0.0.0")), false);
  });
});

Deno.test("isAddressv4ThisNetwork", async (t) => {
  await t.step("matches 0.0.0.0/8", () => {
    assert(isAddressv4ThisNetwork(parseAddressv4("0.0.0.0")));
    assert(isAddressv4ThisNetwork(parseAddressv4("0.0.0.1")));
    assert(isAddressv4ThisNetwork(parseAddressv4("0.255.255.255")));
  });

  await t.step("rejects non-this-network", () => {
    assertEquals(isAddressv4ThisNetwork(parseAddressv4("1.0.0.0")), false);
  });
});

Deno.test("isAddressv4CgNat", async (t) => {
  await t.step("matches 100.64.0.0/10", () => {
    assert(isAddressv4CgNat(parseAddressv4("100.64.0.0")));
    assert(isAddressv4CgNat(parseAddressv4("100.100.100.100")));
    assert(isAddressv4CgNat(parseAddressv4("100.127.255.255")));
  });

  await t.step("rejects non-cgnat", () => {
    assertEquals(isAddressv4CgNat(parseAddressv4("100.63.255.255")), false);
    assertEquals(isAddressv4CgNat(parseAddressv4("100.128.0.0")), false);
  });
});

Deno.test("isAddressv4Benchmarking", async (t) => {
  await t.step("matches 198.18.0.0/15", () => {
    assert(isAddressv4Benchmarking(parseAddressv4("198.18.0.0")));
    assert(isAddressv4Benchmarking(parseAddressv4("198.19.255.255")));
  });

  await t.step("rejects non-benchmarking", () => {
    assertEquals(
      isAddressv4Benchmarking(parseAddressv4("198.17.255.255")),
      false,
    );
    assertEquals(isAddressv4Benchmarking(parseAddressv4("198.20.0.0")), false);
  });
});

Deno.test("isAddressv4Documentation", async (t) => {
  await t.step("matches 192.0.2.0/24 (TEST-NET-1)", () => {
    assert(isAddressv4Documentation(parseAddressv4("192.0.2.0")));
    assert(isAddressv4Documentation(parseAddressv4("192.0.2.255")));
  });

  await t.step("matches 198.51.100.0/24 (TEST-NET-2)", () => {
    assert(isAddressv4Documentation(parseAddressv4("198.51.100.0")));
    assert(isAddressv4Documentation(parseAddressv4("198.51.100.255")));
  });

  await t.step("matches 203.0.113.0/24 (TEST-NET-3)", () => {
    assert(isAddressv4Documentation(parseAddressv4("203.0.113.0")));
    assert(isAddressv4Documentation(parseAddressv4("203.0.113.255")));
  });

  await t.step("rejects non-documentation", () => {
    assertEquals(
      isAddressv4Documentation(parseAddressv4("192.0.1.255")),
      false,
    );
    assertEquals(isAddressv4Documentation(parseAddressv4("192.0.3.0")), false);
    assertEquals(
      isAddressv4Documentation(parseAddressv4("198.51.99.255")),
      false,
    );
    assertEquals(
      isAddressv4Documentation(parseAddressv4("198.51.101.0")),
      false,
    );
    assertEquals(
      isAddressv4Documentation(parseAddressv4("203.0.112.255")),
      false,
    );
    assertEquals(
      isAddressv4Documentation(parseAddressv4("203.0.114.0")),
      false,
    );
  });
});

Deno.test("isAddressv4Public", async (t) => {
  await t.step("matches public addresses", () => {
    assert(isAddressv4Public(parseAddressv4("8.8.8.8")));
    assert(isAddressv4Public(parseAddressv4("1.1.1.1")));
    assert(isAddressv4Public(parseAddressv4("93.184.216.34")));
    assert(isAddressv4Public(parseAddressv4("151.101.1.140")));
  });

  await t.step("rejects all special ranges", () => {
    assertEquals(isAddressv4Public(parseAddressv4("10.0.0.1")), false); // private
    assertEquals(isAddressv4Public(parseAddressv4("172.16.0.1")), false); // private
    assertEquals(isAddressv4Public(parseAddressv4("192.168.1.1")), false); // private
    assertEquals(isAddressv4Public(parseAddressv4("127.0.0.1")), false); // loopback
    assertEquals(isAddressv4Public(parseAddressv4("169.254.1.1")), false); // link-local
    assertEquals(isAddressv4Public(parseAddressv4("224.0.0.1")), false); // multicast
    assertEquals(isAddressv4Public(parseAddressv4("240.0.0.1")), false); // reserved
    assertEquals(isAddressv4Public(parseAddressv4("255.255.255.255")), false); // broadcast
    assertEquals(isAddressv4Public(parseAddressv4("0.0.0.0")), false); // this-network
    assertEquals(isAddressv4Public(parseAddressv4("100.64.0.1")), false); // cg-nat
    assertEquals(isAddressv4Public(parseAddressv4("198.18.0.1")), false); // benchmarking
    assertEquals(isAddressv4Public(parseAddressv4("192.0.2.1")), false); // documentation
  });
});

Deno.test("classifyAddressv4", async (t) => {
  await t.step("classifies all range types", () => {
    assertEquals(
      classifyAddressv4(parseAddressv4("255.255.255.255")),
      "broadcast",
    );
    assertEquals(classifyAddressv4(parseAddressv4("0.0.0.0")), "this-network");
    assertEquals(classifyAddressv4(parseAddressv4("0.0.0.1")), "this-network");
    assertEquals(classifyAddressv4(parseAddressv4("127.0.0.1")), "loopback");
    assertEquals(
      classifyAddressv4(parseAddressv4("169.254.1.1")),
      "link-local",
    );
    assertEquals(
      classifyAddressv4(parseAddressv4("192.0.2.1")),
      "documentation",
    );
    assertEquals(
      classifyAddressv4(parseAddressv4("198.51.100.1")),
      "documentation",
    );
    assertEquals(
      classifyAddressv4(parseAddressv4("203.0.113.1")),
      "documentation",
    );
    assertEquals(
      classifyAddressv4(parseAddressv4("198.18.0.1")),
      "benchmarking",
    );
    assertEquals(classifyAddressv4(parseAddressv4("100.64.0.1")), "cg-nat");
    assertEquals(classifyAddressv4(parseAddressv4("10.0.0.1")), "private");
    assertEquals(classifyAddressv4(parseAddressv4("172.16.0.1")), "private");
    assertEquals(classifyAddressv4(parseAddressv4("192.168.1.1")), "private");
    assertEquals(classifyAddressv4(parseAddressv4("224.0.0.1")), "multicast");
    assertEquals(classifyAddressv4(parseAddressv4("240.0.0.0")), "reserved");
    assertEquals(classifyAddressv4(parseAddressv4("8.8.8.8")), "public");
    assertEquals(classifyAddressv4(parseAddressv4("1.1.1.1")), "public");
  });
});
