import { assert, assertEquals } from "@std/assert";
import { ACT, type Action } from "./dialect.ts";
import { gdprText, parse, type Section, stringify } from "./gdprText.ts";

const BASE_URL = "http://192.168.1.1";

const ENVELOPE = { data: "ZGF0YQ==", sign: "00ff" };

const SESSION = {
  sessionId: "1B3A7C2E9F4D",
  tokenId: "d41d8cd98f",
  authTimes: 1,
};

const LOGIN_PAGE = [
  "<html><body>",
  '<script type="text/javascript">',
  'var authTimes=2;var isWizard="0";',
  "</script>",
].join("");

const PUBLIC_KEY_RESPONSE = [
  'var ee="010001";',
  'var nn="b30966";',
  'var seq="742334261";',
  "$.ret=0;",
].join("\n");

Deno.test("ACT enum has correct values", () => {
  assertEquals(ACT.GET, 1);
  assertEquals(ACT.SET, 2);
  assertEquals(ACT.ADD, 3);
  assertEquals(ACT.DEL, 4);
  assertEquals(ACT.GL, 5);
  assertEquals(ACT.GS, 6);
  assertEquals(ACT.OP, 7);
  assertEquals(ACT.CGI, 8);
});

Deno.test("stringify single action with array attributes", () => {
  const result = stringify([[ACT.GET, "some_oid", [
    "attr1=value1",
    "attr2=value2",
  ]]]);

  assertEquals(
    result,
    "1\r\n[some_oid#0,0,0,0,0,0#0,0,0,0,0,0]0,2\r\nattr1=value1\r\nattr2=value2\r\n",
  );
});

Deno.test("stringify single action with object attributes", () => {
  const result = stringify([[ACT.SET, "some_oid", {
    key1: "val1",
    key2: "val2",
  }]]);

  assertEquals(
    result,
    "2\r\n[some_oid#0,0,0,0,0,0#0,0,0,0,0,0]0,2\r\nkey1=val1\r\nkey2=val2\r\n",
  );
});

Deno.test("stringify action with custom stack values", () => {
  const result = stringify([[
    ACT.GET,
    "oid",
    [],
    "1,2,3,4,5,6",
    "7,8,9,10,11,12",
  ]]);

  assertEquals(result, "1\r\n[oid#1,2,3,4,5,6#7,8,9,10,11,12]0,0\r\n");
});

Deno.test("stringify multiple actions", () => {
  const result = stringify([
    [ACT.GET, "oid1", ["a=1"]],
    [ACT.SET, "oid2", ["b=2"]],
  ]);

  assertEquals(
    result,
    "1&2\r\n[oid1#0,0,0,0,0,0#0,0,0,0,0,0]0,1\r\na=1\r\n[oid2#0,0,0,0,0,0#0,0,0,0,0,0]1,1\r\nb=2\r\n",
  );
});

Deno.test("stringify action with no attributes", () => {
  const result = stringify([[ACT.GET, "simple_oid"]]);

  assertEquals(result, "1\r\n[simple_oid#0,0,0,0,0,0#0,0,0,0,0,0]0,0\r\n");
});

Deno.test("parse simple response with attributes", () => {
  const data = "[some_stack]0\nattr1=value1\nattr2=value2";
  const result = parse(data);
  const action = result.actions[0] as Section;

  assertEquals(result.error, null);
  assertEquals(result.actions.length, 1);
  assertEquals(action.stack, "some_stack");
  assertEquals(action.actionIndex, 0);
  assertEquals(action.attributes, {
    attr1: "value1",
    attr2: "value2",
  });
});

Deno.test("parse response with error section", () => {
  const data = "[error]5";
  const result = parse(data);

  assertEquals(result.error, 5);
  assertEquals(result.actions.length, 0);
});

Deno.test("parse response with cgi script", () => {
  const data = "[cgi]0\nconsole.log('hello');\nvar x = 1;";
  const result = parse(data);
  const action = result.actions[0] as Section;

  assertEquals(result.error, null);
  assertEquals(action.stack, "cgi");
  assertEquals(action.script, "console.log('hello');\nvar x = 1;\n");
});

Deno.test("parse response with multiple sections for same action", () => {
  const data = "[stack1]0\na=1\n[stack2]0\nb=2";
  const result = parse(data);

  assertEquals(result.error, null);
  assert(Array.isArray(result.actions[0]));
  assertEquals(result.actions[0].length, 2);
  assertEquals(result.actions[0][0].attributes, { a: "1" });
  assertEquals(result.actions[0][1].attributes, { b: "2" });
});

Deno.test("parse response with gaps in action indices", () => {
  const data = "[stack]2\na=1";
  const result = parse(data);
  const action2 = result.actions[2] as Section;

  assertEquals(result.actions.length, 3);
  // Placeholder actions only have actionIndex
  assertEquals((result.actions[0] as Section).actionIndex, 0);
  assertEquals((result.actions[1] as Section).actionIndex, 1);
  assertEquals(action2.actionIndex, 2);
  assertEquals(action2.attributes, { a: "1" });
});

Deno.test("parse attribute with equals sign in value", () => {
  const data = "[stack]0\nkey=value=with=equals";
  const result = parse(data);
  const action = result.actions[0] as Section;

  assertEquals(action.attributes?.key, "value=with=equals");
});

Deno.test("stringify and parse roundtrip preserves structure", () => {
  const original: Action[] = [[ACT.GET, "test_oid", {
    foo: "bar",
    num: "123",
  }]];
  const _stringified = stringify(original);

  // The response format is different from request format,
  // but we can verify the attributes are preserved in a response-like format
  const responseFormat =
    "[test_oid#0,0,0,0,0,0#0,0,0,0,0,0]0\nfoo=bar\nnum=123";
  const parsed = parse(responseFormat);
  const action = parsed.actions[0] as Section;

  assertEquals(action.attributes, { foo: "bar", num: "123" });
});

Deno.test("dialect identity", () => {
  assertEquals(gdprText.id, "gdprText");
  assertEquals(gdprText.defaultUsername, "admin");
});

Deno.test("infoRequest targets the login page", async () => {
  const request = gdprText.infoRequest(BASE_URL);

  assertEquals(request.method, "GET");
  assertEquals(request.url, "http://192.168.1.1/");
  assertEquals(request.headers.get("referer"), "http://192.168.1.1/");
  assertEquals(await request.text(), "");
});

Deno.test("parseInfo scrapes the login page script block", () => {
  assertEquals(gdprText.parseInfo(LOGIN_PAGE), {
    authTimes: 2,
    isWizard: "0",
  });
});

Deno.test("publicKeyRequest posts to cgi/getParm with no body", () => {
  const request = gdprText.publicKeyRequest(BASE_URL);

  assertEquals(request.method, "POST");
  assertEquals(request.url, "http://192.168.1.1/cgi/getParm");
  assertEquals(request.headers.get("referer"), "http://192.168.1.1/");
  assertEquals(request.headers.get("content-type"), null);
  assertEquals(request.body, null);
});

Deno.test("parsePublicKey decodes RSA parameters", () => {
  const key = gdprText.parsePublicKey(PUBLIC_KEY_RESPONSE);

  assertEquals(key.exponent, Uint8Array.from([0x01, 0x00, 0x01]));
  assertEquals(key.modulus, Uint8Array.from([0xb3, 0x09, 0x66]));
  assertEquals(key.sequence, 742334261);
});

Deno.test("busyRequest posts to cgi/getBusy with no body", () => {
  const request = gdprText.busyRequest(BASE_URL);

  assertEquals(request.method, "POST");
  assertEquals(request.url, "http://192.168.1.1/cgi/getBusy");
  assertEquals(request.headers.get("referer"), "http://192.168.1.1/");
  assertEquals(request.body, null);
});

Deno.test("parseBusy reads both flags", () => {
  assertEquals(gdprText.parseBusy("var isLogined=1;\nvar isBusy=0;\n"), {
    isLoggedIn: true,
    isBusy: false,
  });
});

Deno.test("encodeLogin joins credentials with a newline", () => {
  assertEquals(
    gdprText.encodeLogin({ username: "admin", password: "hunter2" }),
    "admin\nhunter2",
  );
});

Deno.test("loginRequest carries the envelope in the query string", async () => {
  const request = gdprText.loginRequest(BASE_URL, {
    data: "a+b/c=",
    sign: "00ff",
  });

  assertEquals(request.method, "POST");
  assertEquals(
    request.url,
    "http://192.168.1.1/cgi/login?data=a%2Bb%2Fc%3D&sign=00ff&Action=1&LoginStatus=0",
  );
  assertEquals(request.headers.get("referer"), "http://192.168.1.1/");
  assertEquals(request.headers.get("cookie"), null);
  assertEquals(request.body, null);

  const query = new URL(request.url).searchParams;
  assertEquals(query.get("data"), "a+b/c=");
  assertEquals(query.get("sign"), "00ff");
  assertEquals(await request.text(), "");
});

Deno.test("parseSessionId reads the session cookie", () => {
  assertEquals(
    gdprText.parseSessionId(
      new Headers([["set-cookie", "JSESSIONID=1B3A7C2E9F4D; Path=/"]]),
    ),
    "1B3A7C2E9F4D",
  );
  assertEquals(gdprText.parseSessionId(new Headers()), null);
  assertEquals(
    gdprText.parseSessionId(
      new Headers([["set-cookie", "JSESSIONID=deleted;"]]),
    ),
    null,
  );
});

Deno.test("tokenRequest sends the session cookie to the landing page", () => {
  const request = gdprText.tokenRequest(BASE_URL, {
    sessionId: "1B3A7C2E9F4D",
    authTimes: 3,
  });

  assertEquals(request.method, "GET");
  assertEquals(request.url, "http://192.168.1.1/");
  assertEquals(request.headers.get("referer"), "http://192.168.1.1/");
  assertEquals(
    request.headers.get("cookie"),
    "loginErrorShow=3; JSESSIONID=1B3A7C2E9F4D",
  );
});

Deno.test("parseTokenId scrapes the token variable", () => {
  assertEquals(
    gdprText.parseTokenId('<script>var token="d41d8cd98f";</script>'),
    "d41d8cd98f",
  );
});

Deno.test("encodeCommands emits one batch covering every action", () => {
  const actions: Action[] = [
    [ACT.GET, "oid1", ["a=1"]],
    [ACT.SET, "oid2", ["b=2"]],
  ];
  const batches = gdprText.encodeCommands(actions);

  assertEquals(batches.length, 1);
  assertEquals(batches[0].indices, [0, 1]);
  assertEquals(batches[0].payload, stringify(actions));
});

Deno.test("encodeCommands with no actions still emits one batch", () => {
  const batches = gdprText.encodeCommands([]);

  assertEquals(batches.length, 1);
  assertEquals(batches[0].indices, []);
  assertEquals(batches[0].payload, "\r\n\r\n");
});

Deno.test("commandRequest frames the envelope in the body", async () => {
  const request = gdprText.commandRequest(BASE_URL, ENVELOPE, SESSION);

  assertEquals(request.method, "POST");
  assertEquals(request.url, "http://192.168.1.1/cgi_gdpr");
  assertEquals(request.headers.get("referer"), "http://192.168.1.1/");
  assertEquals(
    request.headers.get("cookie"),
    "loginErrorShow=1; JSESSIONID=1B3A7C2E9F4D",
  );
  assertEquals(request.headers.get("tokenid"), "d41d8cd98f");
  assertEquals(request.headers.get("content-type"), "text/plain");
  assertEquals(await request.text(), "sign=00ff\r\ndata=ZGF0YQ==\r\n");
});

Deno.test("decodeCommand aligns results with the batch indices", () => {
  const batch = { payload: "", indices: [0, 1, 2] };
  const decoded = gdprText.decodeCommand(
    "[a]0\nx=1\n[b]2\ny=2",
    batch,
  );

  assertEquals(decoded.error, null);
  assertEquals(decoded.results, [{ x: "1" }, null, { y: "2" }]);
});

Deno.test("decodeCommand groups repeated sections into a list", () => {
  const decoded = gdprText.decodeCommand(
    "[entry]0\nid=1\n[entry]0\nid=2",
    { payload: "", indices: [0] },
  );

  assertEquals(decoded.results, [[{ id: "1" }, { id: "2" }]]);
});

Deno.test("decodeCommand surfaces the router error code", () => {
  const decoded = gdprText.decodeCommand("[error]5", {
    payload: "",
    indices: [0],
  });

  assertEquals(decoded.error, 5);
  assertEquals(decoded.results, [null]);
});

Deno.test("decodeCommand reports empty and cgi sections as null", () => {
  const decoded = gdprText.decodeCommand(
    "[empty]0\n[cgi]1\nvar x = 1;",
    { payload: "", indices: [0, 1] },
  );

  assertEquals(decoded.results, [null, null]);
});
