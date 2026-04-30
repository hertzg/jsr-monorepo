/**
 * Login and get session ID
 */

import type { Encryption } from "./encryption.ts";

export interface SessionOptions {
  encryption: Encryption;
  sequence: number;
  username?: string;
  password: string;
}

export async function fetchSessionId(
  baseUrl: string,
  options: SessionOptions,
): Promise<string | null> {
  const { encryption, sequence, username = "admin", password } = options;

  const { data, sign } = encryption.encrypt(
    new TextEncoder().encode(`${username}\n${password}`),
    sequence,
    {
      key: new TextDecoder().decode(encryption.key),
      iv: new TextDecoder().decode(encryption.iv),
    },
  );

  const url = new URL("cgi/login", baseUrl);
  url.searchParams.set("data", data);
  url.searchParams.set("sign", sign);
  url.searchParams.set("Action", "1");
  url.searchParams.set("LoginStatus", "0");

  const response = await fetch(url.href, {
    method: "POST",
    headers: {
      Referer: new URL("/", baseUrl).href,
    },
  });

  const setCookie = response.headers.get("set-cookie");
  const cookieValue = setCookie?.slice(
    setCookie.indexOf("=") + 1,
    setCookie.indexOf(";"),
  );

  return cookieValue !== "deleted" ? cookieValue ?? null : null;
}
