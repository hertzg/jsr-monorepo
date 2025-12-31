import { assertEquals } from "@std/assert";
import { cbc } from "@noble/ciphers/aes.js";
import { md5 } from "@noble/hashes/legacy.js";
import { concat } from "@std/bytes";
import { rsaEncrypt, rsaPad } from "./rsa.ts";
import { createCipher } from "./cipher.ts";

/**
 * Snapshot tests to verify cipher implementations match Node.js crypto behavior.
 * Test vectors were generated using Node.js node:crypto module.
 */

Deno.test("AES-128-CBC encrypt matches node:crypto", () => {
  const testCases = [
    {
      key: "0123456789abcdef",
      iv: "fedcba9876543210",
      plaintext: "Hello, TP-Link!",
      expected: "5158980138a21fea614a757b87bf415e",
    },
    {
      key: "1234567890123456",
      iv: "abcdefghijklmnop",
      plaintext: "test data here!",
      expected: "86596752d6f78fb74882975b8014ce34",
    },
    {
      key: "aaaaaaaaaaaaaaaa",
      iv: "bbbbbbbbbbbbbbbb",
      plaintext: "another test!!!",
      expected: "63daec16486f4ed55ab1b59f548cf022",
    },
  ];

  for (const tc of testCases) {
    const key = new TextEncoder().encode(tc.key);
    const iv = new TextEncoder().encode(tc.iv);
    const plaintext = new TextEncoder().encode(tc.plaintext);

    const cipher = cbc(key, iv);
    const encrypted = cipher.encrypt(plaintext);

    assertEquals(
      encrypted.toHex(),
      tc.expected,
      `AES encrypt failed for "${tc.plaintext}"`,
    );
  }
});

Deno.test("AES-128-CBC decrypt matches node:crypto", () => {
  const testCases = [
    {
      key: "0123456789abcdef",
      iv: "fedcba9876543210",
      ciphertext: "5158980138a21fea614a757b87bf415e",
      expected: "Hello, TP-Link!",
    },
    {
      key: "1234567890123456",
      iv: "abcdefghijklmnop",
      ciphertext: "86596752d6f78fb74882975b8014ce34",
      expected: "test data here!",
    },
    {
      key: "aaaaaaaaaaaaaaaa",
      iv: "bbbbbbbbbbbbbbbb",
      ciphertext: "63daec16486f4ed55ab1b59f548cf022",
      expected: "another test!!!",
    },
  ];

  for (const tc of testCases) {
    const key = new TextEncoder().encode(tc.key);
    const iv = new TextEncoder().encode(tc.iv);
    const ciphertext = Uint8Array.fromHex(tc.ciphertext);

    const cipher = cbc(key, iv);
    const decrypted = cipher.decrypt(ciphertext);

    assertEquals(
      new TextDecoder().decode(decrypted),
      tc.expected,
      `AES decrypt failed for ciphertext "${tc.ciphertext}"`,
    );
  }
});

Deno.test("AES-128-CBC roundtrip", () => {
  const key = new TextEncoder().encode("0123456789abcdef");
  const iv = new TextEncoder().encode("fedcba9876543210");
  const plaintext = new TextEncoder().encode("roundtrip test data!");

  const cipher = cbc(key, iv);
  const encrypted = cipher.encrypt(plaintext);
  const decrypted = cipher.decrypt(encrypted);

  assertEquals(
    new TextDecoder().decode(decrypted),
    "roundtrip test data!",
  );
});

Deno.test("MD5 hash matches node:crypto", () => {
  const testCases = [
    {
      input: "admin1234",
      expected: "c93ccd78b2076528346216b3b2f701e6",
    },
    {
      input: "hello",
      expected: "5d41402abc4b2a76b9719d911017c592",
    },
    {
      input: "",
      expected: "d41d8cd98f00b204e9800998ecf8427e",
    },
    {
      input: "The quick brown fox jumps over the lazy dog",
      expected: "9e107d9d372bb6826bd81d3542a419d6",
    },
  ];

  for (const tc of testCases) {
    const input = new TextEncoder().encode(tc.input);
    const hash = md5(input);

    assertEquals(
      hash.toHex(),
      tc.expected,
      `MD5 hash failed for "${tc.input}"`,
    );
  }
});

Deno.test("RSA encrypt (no padding) matches node:crypto", () => {
  // Test vector generated with Node.js crypto module
  // Using a 1024-bit RSA key
  const modulus = Uint8Array.fromHex(
    "b3096650d220465f74878dbbced0d240218e04068dbb7f2496019751b17066e46b58d5e9fdbc6a6201eb9cd1a611b94ceffec43563260a55922c520a760c32ecacfbc872006aacb202a5e573814c3e02a91fc4221635e2818a249629989d6a953eed30bd088dde1e6b933eea6f18c7f962b47e674c8f758059064178556320c7",
  );
  const exponent = Uint8Array.fromHex("010001");

  // Plaintext padded to modulus size (128 bytes)
  const plaintext = Uint8Array.fromHex(
    "74657374206d65737361676520666f7220727361000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
  );

  const expected =
    "4f3c883546f08ad5fdcf918a47015c769e8e589a7623c41a78e9e59091b80f496b159ea7d9f8fad180bac70269bbdc3076648f579c65c552e072f100a16ccee4effb2999a5631c7657e6f4737fa14cefe54d83cdd555812713ba1adc21efd54969a3b536c1479069f2ca8bc512decf73871075c61c68baab9ea17053df21ea69";

  const encrypted = rsaEncrypt(plaintext, modulus, exponent);

  assertEquals(encrypted.toHex(), expected);
});

Deno.test("rsaPad pads message to specified size", () => {
  const message = new TextEncoder().encode("short");
  const padded = rsaPad(message, 16);

  assertEquals(padded.length, 16);
  assertEquals(new TextDecoder().decode(padded.subarray(0, 5)), "short");
  // Rest should be zeros
  for (let i = 5; i < 16; i++) {
    assertEquals(padded[i], 0);
  }
});

Deno.test("rsaPad returns original if already correct size", () => {
  const message = new TextEncoder().encode("exactly16chars!!");
  const padded = rsaPad(message, 16);

  assertEquals(padded.length, 16);
  assertEquals(new TextDecoder().decode(padded), "exactly16chars!!");
});

Deno.test("RSA multi-chunk encryption matches node:crypto", () => {
  // Test vector generated with Node.js crypto module
  // Data that spans 3 chunks (300 bytes with 128-byte modulus = 3 chunks)
  const modulus = Uint8Array.fromHex(
    "b3096650d220465f74878dbbced0d240218e04068dbb7f2496019751b17066e46b58d5e9fdbc6a6201eb9cd1a611b94ceffec43563260a55922c520a760c32ecacfbc872006aacb202a5e573814c3e02a91fc4221635e2818a249629989d6a953eed30bd088dde1e6b933eea6f18c7f962b47e674c8f758059064178556320c7",
  );
  const exponent = Uint8Array.fromHex("010001");
  const rsaChunkSize = modulus.length; // 128 bytes

  // 300 bytes of data: 50 A's + 50 B's + 50 C's + 50 D's + 50 E's + 50 F's
  const bigData = new TextEncoder().encode(
    "A".repeat(50) + "B".repeat(50) + "C".repeat(50) +
      "D".repeat(50) + "E".repeat(50) + "F".repeat(50),
  );

  assertEquals(bigData.length, 300);

  // Expected encrypted output from Node.js (3 chunks * 128 bytes = 384 bytes)
  const expected =
    "5b7d6781761608123a81322d39bda92ececff5db8c486e2e53b061687ac2332112c48dca8fa1bd779656750a707f2e619739f43f5092b97b1c2cc2bf581d439201cadc0af6b575cacba1c9abf526ad5c6b923e37e201f12d14dcc7a808221b57475ec917e0ea52b6c641109586e0745c47c16727c8564020af0a34a30d0d3372984138a7b36fc9db5e463f6012c2e2b241569daa47dee8132104a6c74e5925c3a974654f7a919c3eca2e3c34842a3b0b9ce480ef3397c600f183d54d5192deddc4c8f69eb28bb2981fd6d0d48e837b67f379dc9628ebf3b38940e946f9b11379f9e0e1b1738eeb6a90cdc4a0a772118436beb929c7d07cf44dd4bcd49aead33a7592bfac5c576959e7bdaa623236c125fe4b5ab4249d2f5ff0dda5af07f8479b5c1bee95939642d0cf4bd8d65a543ad21ab3b48305ca3454a1bb17a4e30af4340ba0929b0f866f5b269f02f28720a6d348fbc97ab414a74fd0f6a57bbf4927b519d351abbbc4ff77487c3c259f588a0a02c5055a1634f86a90beb8080ff782ff";

  // Encrypt using the same chunking logic as createCipher
  const chunkCount = Math.ceil(bigData.length / rsaChunkSize);
  const encryptedChunks: Uint8Array[] = [];

  for (let i = 0; i < chunkCount; i++) {
    const offset = i * rsaChunkSize;
    const chunk = rsaPad(
      bigData.subarray(offset, offset + rsaChunkSize),
      rsaChunkSize,
    );
    encryptedChunks.push(rsaEncrypt(chunk, modulus, exponent));
  }

  const fullEncrypted = concat(encryptedChunks);

  assertEquals(fullEncrypted.length, 384);
  assertEquals(fullEncrypted.toHex(), expected);
});

Deno.test("createCipher allows multiple encryptions with same instance", () => {
  const modulus = Uint8Array.fromHex(
    "b3096650d220465f74878dbbced0d240218e04068dbb7f2496019751b17066e46b58d5e9fdbc6a6201eb9cd1a611b94ceffec43563260a55922c520a760c32ecacfbc872006aacb202a5e573814c3e02a91fc4221635e2818a249629989d6a953eed30bd088dde1e6b933eea6f18c7f962b47e674c8f758059064178556320c7",
  );
  const exponent = Uint8Array.fromHex("010001");
  const key = new TextEncoder().encode("0123456789abcdef");
  const iv = new TextEncoder().encode("fedcba9876543210");

  const cipher = createCipher({ modulus, exponent, key, iv });

  // First encryption should work (15 bytes -> 16 bytes with PKCS7 padding)
  const plaintext1 = new TextEncoder().encode("first message!!");
  const encrypted1 = cipher.aesEncrypt(plaintext1);
  assertEquals(encrypted1.length, 16);

  // Second encryption with same cipher instance should also work
  const plaintext2 = new TextEncoder().encode("second message!");
  const encrypted2 = cipher.aesEncrypt(plaintext2);
  assertEquals(encrypted2.length, 16);

  // Third encryption should also work
  const plaintext3 = new TextEncoder().encode("third message!!");
  const encrypted3 = cipher.aesEncrypt(plaintext3);
  assertEquals(encrypted3.length, 16);

  // Verify decryption works for all
  assertEquals(new TextDecoder().decode(cipher.aesDecrypt(encrypted1)), "first message!!");
  assertEquals(new TextDecoder().decode(cipher.aesDecrypt(encrypted2)), "second message!");
  assertEquals(new TextDecoder().decode(cipher.aesDecrypt(encrypted3)), "third message!!");
});
