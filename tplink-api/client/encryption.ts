/**
 * Encryption orchestration for TP-Link router API
 */

import { md5 } from "@noble/hashes/legacy";
import { type Cipher, createCipher } from "./cipher/cipher.ts";

export interface EncryptionOptions {
  modulus: Uint8Array;
  exponent: Uint8Array;
  username?: string;
  password: string;
}

export interface EncryptedPayload {
  data: string;
  sign: string;
}

export interface Encryption {
  key: Uint8Array;
  iv: Uint8Array;
  encrypt: (
    data: Uint8Array,
    sequence: number,
    signature?: Record<string, string>,
  ) => EncryptedPayload;
  decrypt: (data: string) => string;
}

/** Create an encryption instance for TP-Link router communication */
export function createEncryption(options: EncryptionOptions): Encryption {
  const { modulus, exponent, username = "admin", password } = options;
  const cipher = createCipher({ modulus, exponent });
  const hash = md5(new TextEncoder().encode(`${username}${password}`)).toHex();

  return {
    key: cipher.key,
    iv: cipher.iv,
    encrypt: (
      data: Uint8Array,
      sequence: number,
      signature: Record<string, string> = {},
    ): EncryptedPayload => {
      const encryptedData = cipher.aesEncrypt(data);
      const dataBase64 = encryptedData.toBase64();

      const signed = new URLSearchParams(signature);
      signed.set("h", hash);
      signed.set("s", String(sequence + dataBase64.length));
      const signString = signed.toString();

      const signBytes = new TextEncoder().encode(signString);
      const encryptedSignature = cipher.rsaEncrypt(signBytes);

      return {
        data: dataBase64,
        sign: encryptedSignature.toHex(),
      };
    },
    decrypt: (data: string): string => {
      const decrypted = cipher.aesDecrypt(Uint8Array.fromBase64(data));
      return new TextDecoder().decode(decrypted);
    },
  };
}
