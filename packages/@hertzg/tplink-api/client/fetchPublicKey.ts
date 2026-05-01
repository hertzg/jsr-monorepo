/**
 * Fetch RSA public key and sequence from router
 */

export interface PublicKeyInfo {
  exponent: Uint8Array;
  modulus: Uint8Array;
  sequence: number;
}

interface ExtractedVars {
  exponent: string;
  modulus: string;
  sequence: string;
}

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

export async function fetchPublicKey(baseUrl: string): Promise<PublicKeyInfo> {
  const res = await fetch(new URL("cgi/getParm", baseUrl).href, {
    method: "POST",
    headers: { Referer: new URL("/", baseUrl).href },
  });

  const js = await res.text();
  const { exponent, modulus, sequence } = _extractVariables(js);

  return {
    exponent: Uint8Array.fromHex(exponent),
    modulus: Uint8Array.fromHex(modulus),
    sequence: Number(sequence),
  };
}
