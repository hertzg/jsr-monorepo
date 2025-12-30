/**
 * Fetch router info from the login page
 */

const MARKER = '<script type="text/javascript">';

export interface RouterInfo {
  authTimes?: number;
  [key: string]: unknown;
}

export async function fetchInfo(baseUrl: string): Promise<RouterInfo> {
  const res = await fetch(new URL("/", baseUrl).href, {
    method: "GET",
    headers: { Referer: new URL("/", baseUrl).href },
  });

  const html = await res.text();
  const js = html.slice(html.lastIndexOf(MARKER) + MARKER.length, -9);

  const entries = js
    .split(";")
    .map((s) => s.trim().slice(4))
    .filter((s) => s.length)
    .map((s) => s.split("="))
    .map(([k, v]) => [k, JSON.parse(v)]);

  return Object.fromEntries(entries);
}
