import { test } from "node:test";
import { assertStrictEquals } from "@std/assert";
import { parseArray, stringifyArray } from "./mod.ts";

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
PersistentKeepalive = 25
`;

test("should parse and generate the same output", async () => {
  const arr = await parseArray(SAMPLE);
  const str = await stringifyArray(arr);

  assertStrictEquals(str, SAMPLE);
});

test(`should stringify global properties correctly`, async () => {
  const str = await stringifyArray([
    ["section", [["key", "value"]]],
    [null, [["a", "1"]]],
  ]);

  assertStrictEquals(
    str,
    [
      "a=1",
      "",
      "[section]",
      "key=value",
      "",
    ].join("\n"),
  );
});
