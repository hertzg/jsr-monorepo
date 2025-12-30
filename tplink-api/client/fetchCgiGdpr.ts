/**
 * Execute GDPR API command
 */

import type { Encryption } from "./encryption.ts";

export interface CgiGdprOptions {
  encryption: Encryption;
  sequence: number;
  authTimes?: number;
  sessionId: string;
  tokenId: string;
}

export async function fetchCgiGdpr(
  baseUrl: string,
  payload: string,
  options: CgiGdprOptions
): Promise<string | null> {
  const { encryption, sequence, authTimes = 1, sessionId, tokenId } = options;

  const { data, sign } = encryption.encrypt(
    new TextEncoder().encode(payload),
    sequence
  );

  const res = await fetch(new URL("cgi_gdpr", baseUrl).href, {
    method: "POST",
    headers: {
      Referer: new URL("/", baseUrl).href,
      Cookie: `loginErrorShow=${authTimes}; JSESSIONID=${sessionId}`,
      TokenID: tokenId,
      "Content-Type": "text/plain",
    },
    body: [`sign=${sign}`, `data=${data}`, ""].join("\r\n"),
  });

  if (res.status !== 200) {
    return null;
  }

  const encryptedResponse = await res.text();
  return encryption.decrypt(encryptedResponse);
}
