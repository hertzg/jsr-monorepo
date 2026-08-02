/**
 * Extract the RSA public key and sequence base from the router's key endpoint.
 */

import type { PublicKeyInfo } from "../dialect/dialect.ts";

interface ExtractedVars {
  exponent: string;
  modulus: string;
  sequence: string;
}

/**
 * Pulls the raw `var ee` / `var nn` / `var seq` string values out of the key
 * endpoint's response. Line based and order independent; missing variables come
 * back as empty strings.
 *
 * @param js Public key response body
 * @returns Raw hex exponent, hex modulus and decimal sequence, as strings
 *
 * @example Extract the three variables regardless of order
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { _extractVariables } from "./publicKey.ts";
 *
 * const extracted = _extractVariables(
 *   ['var seq="1785665728";', 'var ee="010001";', 'var nn="b309";', "$.ret=0;"]
 *     .join("\n"),
 * );
 *
 * assertEquals(extracted, {
 *   exponent: "010001",
 *   modulus: "b309",
 *   sequence: "1785665728",
 * });
 * ```
 */
export function _extractVariables(js: string): ExtractedVars {
  return js
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length)
    .reduce(
      (acc, line) => {
        if (line.startsWith("var ee=")) {
          acc.exponent = line.slice(8, -2);
        } else if (line.startsWith("var nn=")) {
          acc.modulus = line.slice(8, -2);
        } else if (line.startsWith("var seq=")) {
          acc.sequence = line.slice(9, -2);
        }
        return acc;
      },
      { exponent: "", modulus: "", sequence: "" },
    );
}

/**
 * Decodes the key endpoint's response into RSA parameters.
 *
 * @param text Public key response body
 * @returns RSA exponent, modulus and sequence base
 *
 * @example Decode a public key response
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parsePublicKeyText } from "./publicKey.ts";
 *
 * const key = parsePublicKeyText(
 *   ['var ee="010001";', 'var nn="b30966";', 'var seq="1785665728";'].join("\n"),
 * );
 *
 * assertEquals(key.exponent, Uint8Array.from([0x01, 0x00, 0x01]));
 * assertEquals(key.modulus, Uint8Array.from([0xb3, 0x09, 0x66]));
 * assertEquals(key.sequence, 1785665728);
 * ```
 */
export function parsePublicKeyText(text: string): PublicKeyInfo {
  const { exponent, modulus, sequence } = _extractVariables(text);

  return {
    exponent: Uint8Array.fromHex(exponent),
    modulus: Uint8Array.fromHex(modulus),
    sequence: Number(sequence),
  };
}
