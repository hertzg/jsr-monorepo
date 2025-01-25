import { test } from "node:test";
import { assertStrictEquals } from "@std/assert";
import { parse, stringify } from "./mod.ts";

const SAMPLE = `[Interface]
Address = 172.31.170.1/24
ListenPort = 51820
PrivateKey = E
MTU = 1420

[Peer]
PublicKey = C
PresharedKey = D
AllowedIPs = 172.31.170.100/32
PersistentKeepalive = 25

[Peer]
PublicKey = B
PresharedKey = A
AllowedIPs = 172.31.170.101/32
PersistentKeepalive = 25`;

test("should parse and generate the same output", () => {
  const obj = parse(SAMPLE);
  const str = stringify(obj);

  assertStrictEquals(str, SAMPLE);
});
