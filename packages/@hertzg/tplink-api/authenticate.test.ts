import { assertEquals } from "@std/assert";
import { assertSpyCalls, resolvesNext, spy } from "@std/testing/mock";
import { authenticate } from "./authenticate.ts";
import { gdprJson, gdprText } from "./dialect/mod.ts";
import type { Credentials } from "./dialect/dialect.ts";

const BASE_URL = "http://192.168.1.1";

/**
 * A 512-bit modulus, the size the firmware actually serves. The size is
 * load-bearing: at 512 bits a login signature (`key&iv&h&s`) needs two RSA
 * blocks and a command signature (`h&s`) needs one. The block-count assertions
 * live in the dialect tests; this file only needs a modulus the cipher accepts.
 */
const MODULUS =
  "b3096650d220465f74878dbbced0d240218e04068dbb7f2496019751b17066e46b58d5e9fdbc6a6201eb9cd1a611b94ceffec43563260a55922c520a760c32ed";

const LOGIN_PAGE =
  '<html><body><script type="text/javascript">var authTimes=2;</script>';

const PUBLIC_KEY_PAGE = [
  'var ee="010001";',
  `var nn="${MODULUS}";`,
  'var seq="742334261";',
  "$.ret=0;",
].join("\n");

const IDLE_BUSY_PAGE = "var isLogined=0;\nvar isBusy=0;\n";
const ACTIVE_BUSY_PAGE = "var isLogined=1;\nvar isBusy=0;\n";

const TOKEN_PAGE = '<html><script>var token="d41d8cd98f";</script></html>';

const loginResponse = () =>
  new Response(null, {
    headers: { "set-cookie": "JSESSIONID=1B3A7C2E9F4D; Path=/; HttpOnly" },
  });

/**
 * The five responses a full flow consumes, in order. Built fresh per call —
 * a `Response` body is single-use.
 */
function flowResponses(
  {
    loginPage = LOGIN_PAGE,
    busyPage = IDLE_BUSY_PAGE,
    login = loginResponse(),
  }: { loginPage?: string; busyPage?: string; login?: Response } = {},
): Response[] {
  return [
    new Response(loginPage),
    new Response(PUBLIC_KEY_PAGE),
    new Response(busyPage),
    login,
    new Response(TOKEN_PAGE),
  ];
}

/** `METHOD /path` per call, which is what proves the orchestrator's ordering. */
function steps(fetch: { calls: { args: unknown[] }[] }): string[] {
  return fetch.calls.map((call) => {
    const request = call.args[0] as Request;
    return `${request.method} ${new URL(request.url).pathname}`;
  });
}

Deno.test("authenticate walks the gdprText flow in order", async () => {
  const fetch = spy(resolvesNext(flowResponses()));

  const auth = await authenticate(BASE_URL, { password: "hunter2", fetch });

  assertSpyCalls(fetch, 5);
  assertEquals(steps(fetch), [
    "GET /",
    "POST /cgi/getParm",
    "POST /cgi/getBusy",
    "POST /cgi/login",
    "GET /",
  ]);

  // The session parsed out of step 4's Set-Cookie has to reach step 5, and the
  // authTimes scraped in step 1 has to reach it too. Neither is observable
  // from the dialect tests, which are handed a SessionContext already built.
  const tokenRequest = fetch.calls[4].args[0] as Request;
  assertEquals(
    tokenRequest.headers.get("cookie"),
    "loginErrorShow=2; JSESSIONID=1B3A7C2E9F4D",
  );

  assertEquals(auth?.sessionId, "1B3A7C2E9F4D");
  assertEquals(auth?.tokenId, "d41d8cd98f");
  assertEquals(auth?.sequence, 742334261);
  assertEquals(auth?.info, { authTimes: 2 });
  assertEquals(auth?.dialect, gdprText);
});

Deno.test("authenticate returns null when already logged in and not forcing", async () => {
  const fetch = spy(
    resolvesNext(flowResponses({ busyPage: ACTIVE_BUSY_PAGE })),
  );

  const auth = await authenticate(BASE_URL, {
    password: "hunter2",
    forceLogin: false,
    fetch,
  });

  assertEquals(auth, null);
  assertSpyCalls(fetch, 3);
});

Deno.test("authenticate returns null when the router issues no session", async () => {
  const fetch = spy(resolvesNext(flowResponses({
    login: new Response(null, {
      headers: { "set-cookie": "JSESSIONID=deleted;" },
    }),
  })));

  const auth = await authenticate(BASE_URL, { password: "hunter2", fetch });

  assertEquals(auth, null);
  assertSpyCalls(fetch, 4);
});

Deno.test("authenticate walks the gdprJson flow in order", async () => {
  const fetch = spy(resolvesNext(
    flowResponses({ loginPage: "<html>an unfamiliar login page</html>" }),
  ));

  const auth = await authenticate(BASE_URL, {
    password: "hunter2",
    dialect: gdprJson,
    fetch,
  });

  assertSpyCalls(fetch, 5);
  assertEquals(steps(fetch), [
    "GET /",
    "POST /cgi/getGDPRParm",
    "POST /cgi/getBusy",
    "POST /cgi_gdpr",
    "GET /",
  ]);

  const tokenRequest = fetch.calls[4].args[0] as Request;
  assertEquals(tokenRequest.headers.get("cookie"), "JSESSIONID=1B3A7C2E9F4D");

  // The unfamiliar login page is fetched for session order and discarded,
  // rather than run through a scraper written for a different firmware.
  assertEquals(auth?.info, {});
  assertEquals(auth?.dialect, gdprJson);
});

Deno.test("authenticate defaults the username per dialect", async () => {
  const seen: string[] = [];

  for (const dialect of [gdprText, gdprJson]) {
    const encodeLogin = spy((credentials: Credentials) => {
      seen.push(credentials.username);
      return dialect.encodeLogin(credentials);
    });

    await authenticate(BASE_URL, {
      password: "hunter2",
      dialect: { ...dialect, encodeLogin },
      fetch: spy(resolvesNext(flowResponses())),
    });

    assertSpyCalls(encodeLogin, 1);
  }

  assertEquals(seen, ["admin", "user"]);
});
