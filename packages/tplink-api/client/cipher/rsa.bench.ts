import { rsaEncrypt, rsaPad } from "./rsa.ts";

// Test RSA key (1024-bit modulus from test vectors)
const modulus = Uint8Array.fromHex(
  "b3096650d220465f74878dbbced0d240218e04068dbb7f2496019751b17066e46b58d5e9fdbc6a6201eb9cd1a611b94ceffec43563260a55922c520a760c32ecacfbc872006aacb202a5e573814c3e02a91fc4221635e2818a249629989d6a953eed30bd088dde1e6b933eea6f18c7f962b47e674c8f758059064178556320c7",
);
const exponent = Uint8Array.fromHex("010001");
const rsaChunkSize = modulus.length; // 128 bytes

// Pre-generate test data
const smallMessage = new Uint8Array(16);
crypto.getRandomValues(smallMessage);

const fullChunk = new Uint8Array(rsaChunkSize);
crypto.getRandomValues(fullChunk);

Deno.bench({
  name: "rsaEncrypt (128-byte chunk)",
  group: "rsaEncrypt",
  fn() {
    rsaEncrypt(fullChunk, modulus, exponent);
  },
});

Deno.bench({
  name: "rsaPad (16 -> 128 bytes)",
  group: "rsaPad",
  fn() {
    rsaPad(smallMessage, rsaChunkSize);
  },
});

Deno.bench({
  name: "rsaPad (128 -> 128 bytes, no-op)",
  group: "rsaPad",
  fn() {
    rsaPad(fullChunk, rsaChunkSize);
  },
});
