export const DEFAULT_BASE_URL = "https://oauth.magticom.ge/auth/";

export const DEFAULT_USER_AGENT =
  "MyMagti/11.9.96 (Magticom.MyMagti; build:1; iOS 18.1.0) Alamofire/5.9.1";

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

export interface GenericErrorResponse {
  error: string;
  error_description: string;
}

export interface TokenInfo {
  access_token: string;
  autoLogin: number;
  expires_in: number;
  jti: string;
  phoneNo: string;
  refresh_token: string;
  scope: string;
  token_type: string;
  userId: number;
  userIdentifier: string;
}

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
