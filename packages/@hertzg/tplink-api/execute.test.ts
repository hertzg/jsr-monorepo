import { assertEquals } from "@std/assert";
import { assertSpyCalls, resolvesNext, spy } from "@std/testing/mock";
import { createEncryption, type Encryption } from "./client/encryption.ts";
import { execute } from "./execute.ts";
import { ACT, type Action, gdprJson } from "./dialect/mod.ts";

const BASE_URL = "http://192.168.1.1";
const SEQUENCE = 742334261;

/**
 * A 512-bit modulus, the size the firmware actually serves — the same fixture
 * `authenticate.test.ts` uses. At this size a command signature (`h&s`) fits in
 * exactly one RSA block, which is what the 128-hex-char assertion below pins.
 */
const MODULUS = Uint8Array.fromHex(
  "b3096650d220465f74878dbbced0d240218e04068dbb7f2496019751b17066e46b58d5e9fdbc6a6201eb9cd1a611b94ceffec43563260a55922c520a760c32ed",
);
const EXPONENT = Uint8Array.fromHex("010001");

function newEncryption(): Encryption {
  return createEncryption({
    modulus: MODULUS,
    exponent: EXPONENT,
    username: "admin",
    password: "hunter2",
  });
}

/** Encrypts a plaintext fixture the way the router would, for the same instance. */
function cannedResponse(encryption: Encryption, plaintext: string): Response {
  const encoder = new TextEncoder();
  return new Response(
    encryption.encrypt(encoder.encode(plaintext), SEQUENCE).data,
  );
}

/** The request handed to the Nth `fetch` call. */
function requestAt(
  fetch: { calls: { args: unknown[] }[] },
  index: number,
): Request {
  return fetch.calls[index].args[0] as Request;
}

Deno.test("execute batches gdprText actions into one request and aligns results", async () => {
  const encryption = newEncryption();
  const actions: Action[] = [
    [ACT.GET, "IGD_DEV_INFO"],
    [ACT.GET, "LTE_BANDINFO"],
  ];
  const fetch = spy(resolvesNext([
    cannedResponse(
      encryption,
      "[IGD_DEV_INFO]0\nmodelName=MR600\n[LTE_BANDINFO]1\nband=3\n",
    ),
  ]));

  const result = await execute(BASE_URL, actions, {
    encryption,
    sequence: SEQUENCE,
    sessionId: "1B3A7C2E9F4D",
    tokenId: "d41d8cd98f",
    fetch,
  });

  // Two actions, one round trip — the batching contract. The request's URL,
  // headers and body framing are pinned in dialect/gdprText.test.ts.
  assertSpyCalls(fetch, 1);

  assertEquals(result, {
    error: null,
    actions: [
      { req: actions[0], res: { modelName: "MR600" } },
      { req: actions[1], res: { band: "3" } },
    ],
  });
});

Deno.test("execute pads unanswered actions with null", async () => {
  const encryption = newEncryption();
  const actions: Action[] = [
    [ACT.GET, "IGD_DEV_INFO"],
    [ACT.GET, "LTE_BANDINFO"],
    [ACT.GET, "WAN_STATUS"],
  ];
  const fetch = spy(resolvesNext([
    cannedResponse(encryption, "[IGD_DEV_INFO]0\nmodelName=MR600\n"),
  ]));

  const result = await execute(BASE_URL, actions, {
    encryption,
    sequence: SEQUENCE,
    sessionId: "sid",
    tokenId: "tok",
    fetch,
  });

  assertEquals(result.actions.length, 3);
  assertEquals(result.actions.map((action) => action.res), [
    { modelName: "MR600" },
    null,
    null,
  ]);
  assertEquals(result.actions.map((action) => action.req), actions);
});

Deno.test("execute surfaces the router error code", async () => {
  const encryption = newEncryption();
  const fetch = spy(resolvesNext([cannedResponse(encryption, "[error]5")]));

  const result = await execute(BASE_URL, [[ACT.GET, "IGD_DEV_INFO"]], {
    encryption,
    sequence: SEQUENCE,
    sessionId: "sid",
    tokenId: "tok",
    fetch,
  });

  assertEquals(result.error, 5);
  assertEquals(result.actions[0].res, null);
});

Deno.test("execute short-circuits on a transport failure", async () => {
  const encryption = newEncryption();
  const fetch = spy(resolvesNext([new Response("nope", { status: 401 })]));

  const result = await execute(BASE_URL, [[ACT.GET, "IGD_DEV_INFO"]], {
    encryption,
    sequence: SEQUENCE,
    sessionId: "sid",
    tokenId: "tok",
    fetch,
  });

  assertEquals(result, { error: -1, actions: [] });
});

Deno.test("execute honours an explicit authTimes", async () => {
  const encryption = newEncryption();
  const fetch = spy(resolvesNext([
    cannedResponse(encryption, "[IGD_DEV_INFO]0\nmodelName=MR600\n"),
  ]));

  await execute(BASE_URL, [[ACT.GET, "IGD_DEV_INFO"]], {
    encryption,
    sequence: SEQUENCE,
    sessionId: "sid",
    tokenId: "tok",
    authTimes: 4,
    fetch,
  });

  // authTimes has to reach the dialect; the cookie is where that shows up.
  assertEquals(
    requestAt(fetch, 0).headers.get("cookie"),
    "loginErrorShow=4; JSESSIONID=sid",
  );
});

Deno.test("execute sends one gdprJson request per action", async () => {
  const encryption = newEncryption();
  const actions: Action[] = [
    [ACT.GET, "DEV2_DEV_INFO"],
    [ACT.GL, "DEV2_LTE_SERVING_CELL_INFO"],
  ];
  const fetch = spy(resolvesNext([
    cannedResponse(encryption, '{"success":true,"data":{"modelName":"NE200"}}'),
    cannedResponse(encryption, '{"success":true,"data":[{"band":"n78"}]}'),
  ]));

  const result = await execute(BASE_URL, actions, {
    encryption,
    sequence: SEQUENCE,
    sessionId: "1B3A7C2E9F4D",
    tokenId: "d41d8cd98f",
    dialect: gdprJson,
    fetch,
  });

  // Two actions, two round trips — the contrast with gdprText's batching.
  // The URL and headers of each are pinned in dialect/gdprJson.test.ts.
  assertSpyCalls(fetch, 2);

  assertEquals(result, {
    error: null,
    actions: [
      { req: actions[0], res: { modelName: "NE200" } },
      { req: actions[1], res: [{ band: "n78" }] },
    ],
  });
});

Deno.test("execute decodes the plain-text reply of a gdprJson cgi action", async () => {
  const encryption = newEncryption();
  const actions: Action[] = [[ACT.CGI, "/cgi/logout"]];
  const fetch = spy(resolvesNext([cannedResponse(encryption, "$.ret=0")]));

  const result = await execute(BASE_URL, actions, {
    encryption,
    sequence: SEQUENCE,
    sessionId: "sid",
    tokenId: "tok",
    dialect: gdprJson,
    fetch,
  });

  assertEquals(result, {
    error: null,
    actions: [{ req: actions[0], res: null }],
  });
});

Deno.test("execute keeps the first error reported across gdprJson round trips", async () => {
  const encryption = newEncryption();
  const actions: Action[] = [
    [ACT.GET, "DEV2_DEV_INFO"],
    [ACT.GET, "DEV2_MEM_STATUS"],
  ];
  const fetch = spy(resolvesNext([
    cannedResponse(encryption, '{"success":false,"errorcode":71011}'),
    cannedResponse(encryption, '{"success":true,"data":{"total":"1024"}}'),
  ]));

  const result = await execute(BASE_URL, actions, {
    encryption,
    sequence: SEQUENCE,
    sessionId: "sid",
    tokenId: "tok",
    dialect: gdprJson,
    fetch,
  });

  assertEquals(result.error, 71011);
  assertEquals(result.actions.map((action) => action.res), [
    null,
    { total: "1024" },
  ]);
});
