/**
 * OAuth helpers for MyMagti API.
 *
 * Provides helpers to obtain OAuth tokens by mimicking the mobile app requests.
 * You can swap the fetch implementation for testing.
 *
 * @example Mocking fetch for tests
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { fetchToken } from "@hertzg/mymagti-api/oauth";
 *
 * const mockFetch: typeof fetch = async (_url, _init) => new Response(
 *   JSON.stringify({
 *     access_token: "A",
 *     autoLogin: 0,
 *     expires_in: 3600,
 *     jti: "id",
 *     phoneNo: "5xxxxxxxx",
 *     refresh_token: "R",
 *     scope: "*",
 *     token_type: "bearer",
 *     userId: 1,
 *     userIdentifier: "u",
 *   }),
 *   { status: 200, headers: { "content-type": "application/json" } },
 * );
 *
 * const res = await fetchToken(
 *   { type: "login", username: "u", password: "p" },
 *   { fetch: mockFetch },
 * );
 *
 * assertEquals(res.result, "success");
 * if (res.result === "success") {
 *   assertEquals(typeof res.data.access_token, "string");
 * }
 * ```
 *
 * @module
 */
export const DEFAULT_BASE_URL = "https://oauth.magticom.ge/auth/";

/**
 * Default user agent string for OAuth requests.
 */
export const DEFAULT_USER_AGENT =
  "MyMagti/11.9.96 (Magticom.MyMagti; build:1; iOS 18.1.0) Alamofire/5.9.1";

/**
 * Default OAuth configuration values.
 */
export const DEFAULTS: {
  login: {
    url: string;
    grantType: string;
    clientId: string;
    authorization: string;
  };
  refresh: {
    url: string;
    grantType: string;
    clientId: string;
    authorization: string;
  };
} = Object.seal({
  login: {
    url: "oauth/token",
    grantType: "mymagti_auth",
    clientId: "MymagtiApp2FAPre",
    authorization:
      "Basic TXltYWd0aUFwcDJGQVByZTpQaXRhbG9AI2RkZWVyYWFzYXNERjIxMyQl",
  },
  refresh: {
    url: "oauth/token",
    grantType: "refresh_token",
    clientId: "MymagtiApp2FAPre",
    authorization:
      "Basic TXltYWd0aUFwcDJGQVByZTpQaXRhbG9AI2RkZWVyYWFzYXNERjIxMyQl",
  },
});

/**
 * Options for OAuth fetch operations.
 */
export type FetchOauthOptions = {
  fetch?: typeof fetch;
  url?: string;
  baseUrl?: string;
  grantType?: string;
  clientId?: string;
  authorization?: string;
  userAgent?: string;
};

async function fetchOauth(
  type: keyof typeof DEFAULTS,
  subUrl: URL | string,
  init: RequestInit = {},
  options: FetchOauthOptions = {},
) {
  const {
    fetch = globalThis.fetch,
    baseUrl = DEFAULT_BASE_URL,
    userAgent = DEFAULT_USER_AGENT,
    authorization = DEFAULTS[type].authorization,
  } = options;

  const url = new URL(subUrl, baseUrl);

  return await fetch(url.toString(), {
    ...init,
    headers: {
      "User-Agent": userAgent,
      Authorization: authorization,
      ...(init.headers || {}),
    },
  });
}

async function oauthGrant(
  type: keyof typeof DEFAULTS,
  formdata: Record<string, string>,
  options: FetchOauthOptions = {},
) {
  const { url, grantType, clientId } = DEFAULTS[type];

  const body = new URLSearchParams();
  body.append("client_id", clientId);
  body.append("grant_type", grantType);
  for (const [key, val] of Object.entries(formdata)) {
    body.append(key, val);
  }

  return await fetchOauth(
    type,
    url,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    },
    options,
  );
}

/**
 * Request type for fetching OAuth tokens.
 */
export type FetchTokenRequest =
  | {
    type: "login";
    username: string;
    password: string;
  }
  | {
    type: "refresh";
    refreshToken: string;
  };

/**
 * Generic error response from OAuth server.
 */
export interface GenericErrorResponse {
  /** Error code */
  error: string;
  /** Error description */
  error_description: string;
}

/**
 * OAuth token information.
 */
export interface TokenInfo {
  /** Access token for API requests */
  access_token: string;
  /** Auto-login flag */
  autoLogin: number;
  /** Token expiration time in seconds */
  expires_in: number;
  /** JWT ID */
  jti: string;
  /** Phone number */
  phoneNo: string;
  /** Refresh token for getting new access tokens */
  refresh_token: string;
  /** Token scope */
  scope: string;
  /** Token type */
  token_type: string;
  /** User ID */
  userId: number;
  /** User identifier */
  userIdentifier: string;
}

/**
 * Result of login/refresh operations.
 */
export type LoginResult =
  | {
    result: "error";
    statusCode: number;
    data: GenericErrorResponse;
  }
  | {
    result: "success";
    statusCode: number;
    data: TokenInfo;
  };

/**
 * Fetches an OAuth token using the provided request.
 * @param request - The token request details
 * @param options - Optional OAuth configuration
 * @returns Promise resolving to the login result
 */
export async function fetchToken(
  request: FetchTokenRequest,
  options: FetchOauthOptions = {},
): Promise<LoginResult> {
  let response;
  switch (request.type) {
    case "login":
      response = await oauthGrant(
        request.type,
        {
          username: request.username,
          password: request.password,
        },
        options,
      );
      break;
    case "refresh":
      response = await oauthGrant(
        request.type,
        {
          refresh_token: request.refreshToken,
        },
        options,
      );
      break;
  }

  if (response.status !== 200) {
    return {
      result: "error",
      statusCode: response.status,
      data: (await response.json()) as GenericErrorResponse,
    };
  }

  return {
    result: "success",
    statusCode: response.status,
    data: (await response.json()) as TokenInfo,
  };
}
