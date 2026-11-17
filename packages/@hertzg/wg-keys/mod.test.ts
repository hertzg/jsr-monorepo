import { spawnSync } from "node:child_process";
import { test } from "node:test";
import {
  assertExists,
  assertNotStrictEquals,
  assertStrictEquals,
} from "@std/assert";
import { decodeBase64, encodeBase64 } from "@std/encoding/base64";
import { encodeHex } from "@std/encoding/hex";
import {
  importPrivateKey,
  importPublicKey,
  publicBytesFromPrivateBytes,
  randomPrivateKeyBytes,
  wgGenKey,
  wgPubKey,
} from "./mod.ts";

test("private key is clamped", () => {
  const key = wgGenKey();
  assertStrictEquals(key.length, 44);

  const bytes = decodeBase64(key);
  assertStrictEquals(bytes.length, 32);

  assertStrictEquals(bytes[0] & 0b00000111, 0);
  assertStrictEquals(bytes[31] & 0b10000000, 0);
  assertStrictEquals(bytes[31] & 0b01000000, 0b01000000);
});

test("public key values are interchangable", async () => {
  const privKeyBytes = randomPrivateKeyBytes();
  const privKeyBase64 = encodeBase64(privKeyBytes);

  assertStrictEquals(
    await wgPubKey(privKeyBase64),
    encodeBase64(await publicBytesFromPrivateBytes(privKeyBytes)),
  );
});

test("importPrivateKey with Uint8Array", async () => {
  const privKeyBytes = randomPrivateKeyBytes();
  const cryptoKey = await importPrivateKey(privKeyBytes);

  assertStrictEquals(cryptoKey.type, "private");
  assertStrictEquals(cryptoKey.algorithm.name, "X25519");
  assertStrictEquals(cryptoKey.extractable, true);
  assertStrictEquals(cryptoKey.usages.length, 1);
  assertStrictEquals(cryptoKey.usages[0], "deriveBits");
});

test("importPrivateKey with base64 string", async () => {
  const privKeyBase64 = wgGenKey();
  const cryptoKey = await importPrivateKey(privKeyBase64);

  assertStrictEquals(cryptoKey.type, "private");
  assertStrictEquals(cryptoKey.algorithm.name, "X25519");
  assertStrictEquals(cryptoKey.extractable, true);
});

test("importPublicKey with Uint8Array", async () => {
  const privKeyBytes = randomPrivateKeyBytes();
  const pubKeyBytes = await publicBytesFromPrivateBytes(privKeyBytes);
  const cryptoKey = await importPublicKey(pubKeyBytes);

  assertStrictEquals(cryptoKey.type, "public");
  assertStrictEquals(cryptoKey.algorithm.name, "X25519");
  assertStrictEquals(cryptoKey.extractable, true);
  assertStrictEquals(cryptoKey.usages.length, 0);
});

test("importPublicKey with base64 string", async () => {
  const privKeyBase64 = wgGenKey();
  const pubKeyBase64 = await wgPubKey(privKeyBase64);
  const cryptoKey = await importPublicKey(pubKeyBase64);

  assertStrictEquals(cryptoKey.type, "public");
  assertStrictEquals(cryptoKey.algorithm.name, "X25519");
  assertStrictEquals(cryptoKey.extractable, true);
});

test("imported keys work with deriveBits", async () => {
  const alicePrivKeyBytes = randomPrivateKeyBytes();
  const alicePubKeyBytes = await publicBytesFromPrivateBytes(alicePrivKeyBytes);

  const bobPrivKeyBytes = randomPrivateKeyBytes();
  const bobPubKeyBytes = await publicBytesFromPrivateBytes(bobPrivKeyBytes);

  const alicePrivKey = await importPrivateKey(alicePrivKeyBytes);
  const bobPrivKey = await importPrivateKey(bobPrivKeyBytes);

  const alicePubKey = await importPublicKey(alicePubKeyBytes);
  const bobPubKey = await importPublicKey(bobPubKeyBytes);

  const aliceShared = await crypto.subtle.deriveBits(
    { name: "X25519", public: bobPubKey },
    alicePrivKey,
    256,
  );

  const bobShared = await crypto.subtle.deriveBits(
    { name: "X25519", public: alicePubKey },
    bobPrivKey,
    256,
  );

  assertStrictEquals(
    encodeHex(aliceShared),
    encodeHex(bobShared),
  );
});

function isWgInstalled() {
  return spawnSync("wg", ["--version"]).error === undefined;
}

test(
  "integration: public key matches output of wg pubkey",
  { skip: !isWgInstalled() },
  async () => {
    const privKey = wgGenKey();
    assertExists(privKey);

    const pubKey = await wgPubKey(privKey);
    assertNotStrictEquals(pubKey, privKey);

    const { stdout: execResult } = spawnSync("wg", ["pubkey"], {
      input: privKey,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "inherit"],
    });

    assertStrictEquals(pubKey, execResult.trim());
  },
);
