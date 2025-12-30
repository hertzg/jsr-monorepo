/**
 * Authentication for TP-Link router API
 */

import { fetchInfo, type RouterInfo } from "./client/fetchInfo.ts";
import { fetchPublicKey } from "./client/fetchPublicKey.ts";
import { createEncryption, type Encryption } from "./client/encryption.ts";
import { fetchBusy } from "./client/fetchBusy.ts";
import { fetchSessionId } from "./client/fetchSessionId.ts";
import { fetchTokenId } from "./client/fetchTokenId.ts";

export interface AuthOptions {
  username?: string;
  password: string;
  forceLogin?: boolean;
}

export interface AuthResult {
  encryption: Encryption;
  sequence: number;
  info: RouterInfo;
  sessionId: string;
  tokenId: string;
}

export async function authenticate(
  baseUrl: string,
  options: AuthOptions
): Promise<AuthResult | null> {
  const { username = "admin", password, forceLogin = true } = options;

  const info = await fetchInfo(baseUrl);

  const { sequence, ...keyParameters } = await fetchPublicKey(baseUrl);
  const encryption = createEncryption({
    ...keyParameters,
    username,
    password,
  });

  const { isLoggedIn } = await fetchBusy(baseUrl);
  if (isLoggedIn && !forceLogin) {
    return null;
  }

  const sessionId = await fetchSessionId(baseUrl, {
    encryption,
    sequence,
    username,
    password,
  });
  if (!sessionId) {
    return null;
  }

  const tokenId = await fetchTokenId(baseUrl, {
    authTimes: info.authTimes,
    sessionId,
  });

  return { encryption, sequence, info, sessionId, tokenId };
}
