/**
 * Authentication for TP-Link router API.
 *
 * Implements the multi-step authentication flow required by TP-Link routers,
 * including RSA key exchange, AES encryption setup, and session/token retrieval.
 */

import { fetchInfo, type RouterInfo } from "./client/fetchInfo.ts";
import { fetchPublicKey } from "./client/fetchPublicKey.ts";
import { createEncryption, type Encryption } from "./client/encryption.ts";
import { fetchBusy } from "./client/fetchBusy.ts";
import { fetchSessionId } from "./client/fetchSessionId.ts";
import { fetchTokenId } from "./client/fetchTokenId.ts";

/**
 * Options for authenticating with the router.
 */
export interface AuthOptions {
  /** Username for authentication (defaults to "admin") */
  username?: string;
  /** Password for authentication */
  password: string;
  /** Force re-authentication even if already logged in (defaults to true) */
  forceLogin?: boolean;
}

/**
 * Result of successful authentication containing all data needed for API calls.
 */
export interface AuthResult {
  /** Encryption instance for encrypting/decrypting API payloads */
  encryption: Encryption;
  /** Sequence number for request signing */
  sequence: number;
  /** Router information retrieved during authentication */
  info: RouterInfo;
  /** Session ID cookie value */
  sessionId: string;
  /** Security token for API requests */
  tokenId: string;
}

/**
 * Authenticates with a TP-Link router and returns session context.
 *
 * Performs the following steps:
 * 1. Fetches router info from the login page
 * 2. Retrieves RSA public key for encryption
 * 3. Creates encryption instance with AES + RSA
 * 4. Checks if already logged in
 * 5. Performs login to get session ID
 * 6. Retrieves security token for API calls
 *
 * @param baseUrl Base URL of the router (e.g., "http://192.168.1.1")
 * @param options Authentication options including password
 * @returns Authentication result with encryption context, or null if login failed
 *
 * @example Basic authentication
 * ```ts ignore
 * import { authenticate } from "./authenticate.ts";
 *
 * const auth = await authenticate("http://192.168.1.1", {
 *   password: "admin",
 * });
 *
 * if (auth) {
 *   // Use auth.encryption, auth.sessionId, auth.tokenId for API calls
 * }
 * ```
 *
 * @example Authentication with custom username
 * ```ts ignore
 * import { authenticate } from "./authenticate.ts";
 *
 * const auth = await authenticate("http://192.168.1.1", {
 *   username: "user",
 *   password: "secret",
 *   forceLogin: false,
 * });
 * ```
 */
export async function authenticate(
  baseUrl: string,
  options: AuthOptions,
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
