import {
  assertExists,
  assertNotStrictEquals,
  assertStrictEquals,
} from "@std/assert";
import {
  importPrivateKey,
  importPublicKey,
  publicBytesFromPrivateBytes,
  randomPrivateKeyBytes,
  wgGenKey,
  wgPubKey,
} from "./mod.ts";

Deno.test("private key is clamped", () => {
  const key = wgGenKey();
  assertStrictEquals(key.length, 44);

  const bytes = Uint8Array.fromBase64(key);
  assertStrictEquals(bytes.length, 32);

  assertStrictEquals(bytes[0] & 0b00000111, 0);
  assertStrictEquals(bytes[31] & 0b10000000, 0);
  assertStrictEquals(bytes[31] & 0b01000000, 0b01000000);
});

Deno.test("public key values are interchangable", async () => {
  const privKeyBytes = randomPrivateKeyBytes();
  const privKeyBase64 = privKeyBytes.toBase64();

  assertStrictEquals(
    await wgPubKey(privKeyBase64),
    (await publicBytesFromPrivateBytes(privKeyBytes)).toBase64(),
  );
});

Deno.test("importPrivateKey with Uint8Array", async () => {
  const privKeyBytes = randomPrivateKeyBytes();
  const cryptoKey = await importPrivateKey(privKeyBytes);

  assertStrictEquals(cryptoKey.type, "private");
  assertStrictEquals(cryptoKey.algorithm.name, "X25519");
  assertStrictEquals(cryptoKey.extractable, true);
  assertStrictEquals(cryptoKey.usages.length, 1);
  assertStrictEquals(cryptoKey.usages[0], "deriveBits");
});

Deno.test("importPrivateKey with base64 string", async () => {
  const privKeyBase64 = wgGenKey();
  const cryptoKey = await importPrivateKey(privKeyBase64);

  assertStrictEquals(cryptoKey.type, "private");
  assertStrictEquals(cryptoKey.algorithm.name, "X25519");
  assertStrictEquals(cryptoKey.extractable, true);
});

Deno.test("importPublicKey with Uint8Array", async () => {
  const privKeyBytes = randomPrivateKeyBytes();
  const pubKeyBytes = await publicBytesFromPrivateBytes(privKeyBytes);
  const cryptoKey = await importPublicKey(pubKeyBytes);

  assertStrictEquals(cryptoKey.type, "public");
  assertStrictEquals(cryptoKey.algorithm.name, "X25519");
  assertStrictEquals(cryptoKey.extractable, true);
  assertStrictEquals(cryptoKey.usages.length, 0);
});

Deno.test("importPublicKey with base64 string", async () => {
  const privKeyBase64 = wgGenKey();
  const pubKeyBase64 = await wgPubKey(privKeyBase64);
  const cryptoKey = await importPublicKey(pubKeyBase64);

  assertStrictEquals(cryptoKey.type, "public");
  assertStrictEquals(cryptoKey.algorithm.name, "X25519");
  assertStrictEquals(cryptoKey.extractable, true);
});

Deno.test("imported keys work with deriveBits", async () => {
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
    new Uint8Array(aliceShared).toHex(),
    new Uint8Array(bobShared).toHex(),
  );
});

async function isGivenEnoughPermissions() {
  try {
    const [runPerm, envPerm, readPerm] = await Promise.all([
      Deno.permissions.query({ name: "run" }),
      Deno.permissions.query({ name: "env" }),
      Deno.permissions.query({ name: "read" }),
    ]);

    return (
      readPerm.state === "granted" &&
      envPerm.state === "granted" &&
      runPerm.state === "granted"
    );
  } catch (_) {
    return false;
  }
}

Deno.test({
  name: "integration: public key matches output of wg pubkey",
  ignore: !(await isGivenEnoughPermissions()),
  async fn() {
    const privKey = wgGenKey();
    assertExists(privKey);

    const pubKey = await wgPubKey(privKey);
    assertNotStrictEquals(pubKey, privKey);

    const command = new Deno.Command("wg", {
      args: ["pubkey"],
      stdin: "piped",
      stdout: "piped",
      stderr: "inherit",
    });

    const proc = command.spawn();
    const writer = proc.stdin.getWriter();
    await writer.write(new TextEncoder().encode(privKey));
    await writer.close();

    const { stdout } = await proc.output();
    const execResult = new TextDecoder().decode(stdout);

    assertStrictEquals(pubKey, execResult.trim());
  },
});
