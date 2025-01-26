import { test } from "node:test";
import { parse, stringify } from "./mod.ts";
import { assertEquals } from "@std/assert";

const TEXT = `[Interface]
Address = 192.0.2.1/24
ListenPort = 51820
PrivateKey = E
MTU = 1420

[Peer]
PublicKey = C
PresharedKey = D
AllowedIPs = 192.0.2.100/32
PersistentKeepalive = 25

[Peer]
PublicKey = B
PresharedKey = A
AllowedIPs = 192.0.2.101/32
PersistentKeepalive = 25
`;

const OBJECT = {
  Interface: {
    Address: ["192.0.2.1/24"],
    ListenPort: 51820,
    PrivateKey: "E",
    MTU: 1420,
  },
  Peers: [
    {
      PublicKey: "C",
      PresharedKey: "D",
      AllowedIPs: ["192.0.2.100/32"],
      PersistentKeepalive: 25,
    },
    {
      PublicKey: "B",
      PresharedKey: "A",
      AllowedIPs: ["192.0.2.101/32"],
      PersistentKeepalive: 25,
    },
  ],
};

test("parse and serialize should yield same results as original", async () => {
  assertEquals(await stringify(await parse(TEXT)), TEXT);
  assertEquals(await parse(await stringify(OBJECT)), OBJECT);
});

test("should parse correctly", async () => {
  const obj = await parse(TEXT);
  assertEquals(obj, OBJECT);
});

test("should stringify correctly", async () => {
  const str = await stringify(OBJECT);
  assertEquals(str, TEXT);
});
