import { createMontgomeryParams } from "./montgomery.ts";
import { rsaEncrypt, rsaPad } from "./rsa.ts";
import { bytesToBigInt } from "./utils.ts";

// Test RSA key (1024-bit modulus from test vectors)
const modulus = BigInt(
  "0xb3096650d220465f74878dbbced0d240218e04068dbb7f2496019751b17066e46b58d5e9fdbc6a6201eb9cd1a611b94ceffec43563260a55922c520a760c32ecacfbc872006aacb202a5e573814c3e02a91fc4221635e2818a249629989d6a953eed30bd088dde1e6b933eea6f18c7f962b47e674c8f758059064178556320c7",
);
const exponent = BigInt("0x010001");
const params = createMontgomeryParams(modulus);
const rsaChunkSize = 128; // 1024-bit modulus = 128 bytes

// Pre-generate test data
const smallMessage = new Uint8Array(16);
crypto.getRandomValues(smallMessage);
const smallValue = bytesToBigInt(smallMessage);

const fullChunk = new Uint8Array(rsaChunkSize);
crypto.getRandomValues(fullChunk);
const fullValue = bytesToBigInt(fullChunk);

Deno.bench("rsaEncrypt (128-byte chunk)", () => {
  rsaEncrypt(fullValue, exponent, params);
});

Deno.bench("rsaPad (16 -> 128 bytes)", () => {
  rsaPad(smallValue, 16, rsaChunkSize);
});

Deno.bench("rsaPad (128 -> 128 bytes, no-op)", () => {
  rsaPad(fullValue, rsaChunkSize, rsaChunkSize);
});
