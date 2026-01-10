import { bigIntToBytes, bytesToBigInt } from "./utils.ts";

// Pre-generate test data for various sizes
const sizes = [32, 64, 128, 256, 512, 1024];

const testData = sizes.map((size) => {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  const bigint = bytesToBigInt(bytes);
  return { size, bytes, bigint };
});

for (const { size, bytes, bigint } of testData) {
  Deno.bench({
    name: `bytesToBigInt (${size} bytes)`,
    group: "bytesToBigInt",
    fn() {
      bytesToBigInt(bytes);
    },
  });

  Deno.bench({
    name: `bigIntToBytes (${size} bytes)`,
    group: "bigIntToBytes",
    fn() {
      bigIntToBytes(bigint, size);
    },
  });
}
