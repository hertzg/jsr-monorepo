/**
 * Cipher factory for TP-Link router encryption
 */

import { cbc } from "@noble/ciphers/aes.js";
import { rsaEncrypt, rsaPad } from "./rsa.ts";
import { bigIntToBytes, bytesToBigInt } from "./utils.ts";

export interface CipherOptions {
  modulus: Uint8Array;
  exponent: Uint8Array;
  key?: Uint8Array;
  iv?: Uint8Array;
}

export interface Cipher {
  key: Uint8Array;
  iv: Uint8Array;
  aesEncrypt: (data: Uint8Array) => Uint8Array;
  aesDecrypt: (data: Uint8Array) => Uint8Array;
  rsaEncrypt: (data: Uint8Array) => Uint8Array;
}

/** Generate a 16-byte key/IV using timestamp and random */
function generateKey(): Uint8Array {
  const keyStr = `${Date.now()}${1e9 * Math.random()}`.substring(0, 16);
  return new TextEncoder().encode(keyStr);
}

/** Create a cipher instance for TP-Link router encryption */
export function createCipher(options: CipherOptions): Cipher {
  const key = options.key ?? generateKey();
  const iv = options.iv ?? generateKey();

  const k = options.modulus.length;
  const bitsPerChunk = BigInt(k * 8);
  const n = bytesToBigInt(options.modulus);
  const e = bytesToBigInt(options.exponent);

  return {
    key,
    iv,
    aesEncrypt: (data: Uint8Array) => cbc(key, iv).encrypt(data),
    aesDecrypt: (data: Uint8Array) => cbc(key, iv).decrypt(data),
    rsaEncrypt: (data: Uint8Array) => {
      const chunkCount = Math.ceil(data.length / k);

      // Accumulate encrypted chunks in bigint, convert once at end
      let accumulated = 0n;
      for (let i = 0; i < chunkCount; i++) {
        const chunk = rsaPad(data.subarray(i * k, (i + 1) * k), k);
        accumulated = (accumulated << bitsPerChunk) | rsaEncrypt(chunk, n, e);
      }

      return bigIntToBytes(accumulated, chunkCount * k);
    },
  };
}
