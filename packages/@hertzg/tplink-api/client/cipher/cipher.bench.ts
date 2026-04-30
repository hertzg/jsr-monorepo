import { createCipher } from "./cipher.ts";

// Test RSA key (1024-bit modulus from test vectors)
const modulus = Uint8Array.fromHex(
  "b3096650d220465f74878dbbced0d240218e04068dbb7f2496019751b17066e46b58d5e9fdbc6a6201eb9cd1a611b94ceffec43563260a55922c520a760c32ecacfbc872006aacb202a5e573814c3e02a91fc4221635e2818a249629989d6a953eed30bd088dde1e6b933eea6f18c7f962b47e674c8f758059064178556320c7",
);
const exponent = Uint8Array.fromHex("010001");
const key = new TextEncoder().encode("0123456789abcdef");
const iv = new TextEncoder().encode("fedcba9876543210");

const cipher = createCipher({ modulus, exponent, key, iv });

// Pre-generate test data for various sizes
const sizes = [16, 64, 128, 256, 512];

const testData = sizes.map((size) => {
  const data = new Uint8Array(size);
  crypto.getRandomValues(data);
  const encrypted = cipher.aesEncrypt(data);
  return { size, data, encrypted };
});

// AES benchmarks
for (const { size, data, encrypted } of testData) {
  Deno.bench(`aesEncrypt (${size} bytes)`, () => {
    cipher.aesEncrypt(data);
  });

  Deno.bench(`aesDecrypt (${size} bytes)`, () => {
    cipher.aesDecrypt(encrypted);
  });
}

// RSA benchmarks (chunked encryption)
const rsaSizes = [32, 128, 256, 384];

const rsaTestData = rsaSizes.map((size) => {
  const data = new Uint8Array(size);
  crypto.getRandomValues(data);
  return { size, data };
});

for (const { size, data } of rsaTestData) {
  const chunks = Math.ceil(size / modulus.length);
  Deno.bench(
    `cipher.rsaEncrypt (${size} bytes, ${chunks} chunk${chunks > 1 ? "s" : ""})`,
    () => {
      cipher.rsaEncrypt(data);
    },
  );
}

// createCipher benchmark
Deno.bench("createCipher (with provided key/iv)", () => {
  createCipher({ modulus, exponent, key, iv });
});

Deno.bench("createCipher (generate key/iv)", () => {
  createCipher({ modulus, exponent });
});
