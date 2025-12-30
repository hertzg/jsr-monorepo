/**
 * Fetch token ID from authenticated page
 */

export interface TokenOptions {
  authTimes?: number;
  sessionId: string;
}

export async function fetchTokenId(
  baseUrl: string,
  options: TokenOptions,
): Promise<string> {
  const { authTimes = 1, sessionId } = options;

  const res = await fetch(new URL("/", baseUrl).href, {
    method: "GET",
    headers: {
      Referer: new URL("/", baseUrl).href,
      Cookie: `loginErrorShow=${authTimes}; JSESSIONID=${sessionId}`,
    },
  });

  const html = await res.text();
  const match = html.match(/var token="([^"]*)"/);

  if (!match) {
    throw new Error("Token not found in response");
  }

  return match[1];
}
