import { assertEquals, assertNotEquals } from "@std/assert";
import { authenticate } from "./authenticate.ts";
import { gdprJson, gdprText } from "./dialect/mod.ts";

const BASE_URL = "http://192.168.1.1";

/**
 * A 512-bit modulus, the size the firmware actually serves. The size is
 * load-bearing: at 512 bits a login signature (`key&iv&h&s`) needs two RSA
 * blocks and a command signature (`h&s`) needs one, which is what the length
 * assertions below distinguish. A larger modulus makes both fit in one block
 * and the assertions vacuous.
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

const LOGIN_RESPONSE = () =>
  new Response(null, {
    headers: { "set-cookie": "JSESSIONID=1B3A7C2E9F4D; Path=/; HttpOnly" },
  });

function recordingFetch(responses: readonly (() => Response)[]): {
  fetch: typeof globalThis.fetch;
  requests: Request[];
} {
  const requests: Request[] = [];
  let index = 0;

  return {
    requests,
    fetch: (input) => {
      requests.push(input as Request);
      return Promise.resolve(responses[index++]());
    },
  };
}

function gdprTextResponses(busyPage = IDLE_BUSY_PAGE) {
  return [
    () => new Response(LOGIN_PAGE),
    () => new Response(PUBLIC_KEY_PAGE),
    () => new Response(busyPage),
    LOGIN_RESPONSE,
    () => new Response(TOKEN_PAGE),
  ];
}

Deno.test("authenticate walks the gdprText flow in order", async () => {
  const { fetch, requests } = recordingFetch(gdprTextResponses());

  const auth = await authenticate(BASE_URL, { password: "hunter2", fetch });

  assertEquals(requests.length, 5);
  assertEquals(
    requests.map((request) =>
      `${request.method} ${request.url}`.replace(
        /\?data=.*$/,
        "?data=…",
      )
    ),
    [
      "GET http://192.168.1.1/",
      "POST http://192.168.1.1/cgi/getParm",
      "POST http://192.168.1.1/cgi/getBusy",
      "POST http://192.168.1.1/cgi/login?data=…",
      "GET http://192.168.1.1/",
    ],
  );

  const loginQuery = new URL(requests[3].url).searchParams;
  assertEquals(loginQuery.get("Action"), "1");
  assertEquals(loginQuery.get("LoginStatus"), "0");
  assertEquals(loginQuery.get("sign")?.length, 256);
  assertNotEquals(loginQuery.get("data"), null);

  assertEquals(
    requests[4].headers.get("cookie"),
    "loginErrorShow=2; JSESSIONID=1B3A7C2E9F4D",
  );

  assertEquals(auth?.sessionId, "1B3A7C2E9F4D");
  assertEquals(auth?.tokenId, "d41d8cd98f");
  assertEquals(auth?.sequence, 742334261);
  assertEquals(auth?.info, { authTimes: 2 });
  assertEquals(auth?.dialect, gdprText);
});

Deno.test("authenticate returns null when already logged in and not forcing", async () => {
  const { fetch, requests } = recordingFetch(
    gdprTextResponses(ACTIVE_BUSY_PAGE),
  );

  const auth = await authenticate(BASE_URL, {
    password: "hunter2",
    forceLogin: false,
    fetch,
  });

  assertEquals(auth, null);
  assertEquals(requests.length, 3);
});

Deno.test("authenticate returns null when the router issues no session", async () => {
  const responses = gdprTextResponses();
  responses[3] = () =>
    new Response(null, { headers: { "set-cookie": "JSESSIONID=deleted;" } });
  const { fetch, requests } = recordingFetch(responses);

  const auth = await authenticate(BASE_URL, { password: "hunter2", fetch });

  assertEquals(auth, null);
  assertEquals(requests.length, 4);
});

Deno.test("authenticate walks the gdprJson flow in order", async () => {
  const { fetch, requests } = recordingFetch([
    () => new Response("<html>an unfamiliar login page</html>"),
    () => new Response(PUBLIC_KEY_PAGE),
    () => new Response(IDLE_BUSY_PAGE),
    LOGIN_RESPONSE,
    () => new Response(TOKEN_PAGE),
  ]);

  const auth = await authenticate(BASE_URL, {
    password: "hunter2",
    dialect: gdprJson,
    fetch,
  });

  assertEquals(
    requests.map((request) => `${request.method} ${request.url}`),
    [
      "GET http://192.168.1.1/",
      "POST http://192.168.1.1/cgi/getGDPRParm",
      "POST http://192.168.1.1/cgi/getBusy",
      "POST http://192.168.1.1/cgi_gdpr?9",
      "GET http://192.168.1.1/",
    ],
  );

  const [signLine, dataLine, trailer] = (await requests[3].text()).split(
    "\r\n",
  );
  assertEquals(signLine.slice(0, 5), "sign=");
  assertEquals(signLine.length - 5, 256);
  assertEquals(dataLine.slice(0, 5), "data=");
  assertEquals(trailer, "");

  assertEquals(requests[4].headers.get("cookie"), "JSESSIONID=1B3A7C2E9F4D");
  assertEquals(auth?.info, {});
  assertEquals(auth?.dialect, gdprJson);
});

Deno.test("authenticate defaults the username per dialect", async () => {
  const seen: string[] = [];

  for (const dialect of [gdprText, gdprJson]) {
    const encodeLogin = dialect.encodeLogin;
    const spy = {
      ...dialect,
      encodeLogin: (credentials: { username: string; password: string }) => {
        seen.push(credentials.username);
        return encodeLogin(credentials);
      },
    };
    const { fetch } = recordingFetch(gdprTextResponses());

    await authenticate(BASE_URL, {
      password: "hunter2",
      dialect: spy,
      fetch,
    });
  }

  assertEquals(seen, ["admin", "user"]);
});
