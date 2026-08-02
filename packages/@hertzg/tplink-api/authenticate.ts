/**
 * Authentication for TP-Link router API.
 *
 * Implements the multi-step authentication flow required by TP-Link routers,
 * including RSA key exchange, AES encryption setup, and session/token
 * retrieval. Every protocol detail lives in the {@linkcode Dialect}; this module
 * owns only the I/O, the ordering, and the signature rule, and never branches on
 * which dialect it was given.
 */

import type { Dialect, RouterInfo } from "./dialect/dialect.ts";
import { gdprText } from "./dialect/gdprText.ts";
import { createEncryption, type Encryption } from "./client/encryption.ts";

/**
 * Options for authenticating with the router.
 */
export interface AuthOptions {
  /** Username for authentication (defaults to the dialect's default username) */
  username?: string;
  /** Password for authentication */
  password: string;
  /** Force re-authentication even if already logged in (defaults to true) */
  forceLogin?: boolean;
  /** Firmware dialect to speak (defaults to {@linkcode gdprText}) */
  dialect?: Dialect;
  /** Swappable `fetch`, for tests or non-standard HTTP stacks */
  fetch?: typeof globalThis.fetch;
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
  /** Dialect used, carried forward so `execute` needs no extra argument */
  dialect: Dialect;
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
 *
 * @example Authentication against a JSON-dialect router
 * ```ts ignore
 * import { authenticate } from "./authenticate.ts";
 * import { gdprJson } from "./dialect/mod.ts";
 *
 * const auth = await authenticate("http://192.168.254.1", {
 *   password: "secret",
 *   dialect: gdprJson,
 * });
 * ```
 */
export async function authenticate(
  baseUrl: string,
  options: AuthOptions,
): Promise<AuthResult | null> {
  const {
    password,
    forceLogin = true,
    dialect = gdprText,
    fetch = globalThis.fetch,
    username = dialect.defaultUsername,
  } = options;

  const info = dialect.parseInfo(
    await (await fetch(dialect.infoRequest(baseUrl))).text(),
  );

  const { sequence, ...keyParameters } = dialect.parsePublicKey(
    await (await fetch(dialect.publicKeyRequest(baseUrl))).text(),
  );
  const encryption = createEncryption({
    ...keyParameters,
    username,
    password,
  });

  const { isLoggedIn } = dialect.parseBusy(
    await (await fetch(dialect.busyRequest(baseUrl))).text(),
  );
  if (isLoggedIn && !forceLogin) {
    return null;
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const envelope = encryption.encrypt(
    encoder.encode(dialect.encodeLogin({ username, password })),
    sequence,
    {
      key: decoder.decode(encryption.key),
      iv: decoder.decode(encryption.iv),
    },
  );

  const loginResponse = await fetch(dialect.loginRequest(baseUrl, envelope));
  const sessionId = dialect.parseSessionId(loginResponse.headers);
  await loginResponse.body?.cancel();
  if (!sessionId) {
    return null;
  }

  const tokenId = dialect.parseTokenId(
    await (await fetch(dialect.tokenRequest(baseUrl, {
      sessionId,
      authTimes: info.authTimes ?? 1,
    }))).text(),
  );

  return { encryption, sequence, info, sessionId, tokenId, dialect };
}
