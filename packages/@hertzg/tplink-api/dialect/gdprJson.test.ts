import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { ACT, type Action } from "./dialect.ts";
import { encodeAction, gdprJson } from "./gdprJson.ts";
import { gdprText } from "./gdprText.ts";

const BASE_URL = "http://192.168.254.1";

const ENVELOPE = { data: "ZGF0YQ==", sign: "00ff" };

const SESSION = {
  sessionId: "1B3A7C2E9F4D",
  tokenId: "d41d8cd98f",
  authTimes: 1,
};

/**
 * Response shape observed in the NE200 reference implementation: a `success`
 * flag plus a `data` object for `go` and a `data` array for `gl`.
 */
const GO_RESPONSE =
  '{"success":true,"data":{"networkType":"9","signalStrength":"4","connectedBand":"n78"}}';

const GL_RESPONSE =
  '{"success":true,"data":[{"band":"n78","cellConnectionStatus":"1"},{"band":"1","cellConnectionStatus":"0"}]}';

Deno.test("dialect identity", () => {
  assertEquals(gdprJson.id, "gdprJson");
  assertEquals(gdprJson.defaultUsername, "user");
});

Deno.test("shares the gdprText parsers it does not override", () => {
  assertEquals(gdprJson.parsePublicKey, gdprText.parsePublicKey);
  assertEquals(gdprJson.parseBusy, gdprText.parseBusy);
  assertEquals(gdprJson.parseSessionId, gdprText.parseSessionId);
  assertEquals(gdprJson.parseTokenId, gdprText.parseTokenId);
  assertEquals(gdprJson.infoRequest, gdprText.infoRequest);
  assertEquals(gdprJson.busyRequest, gdprText.busyRequest);
});

/**
 * The tail of a real NE200 login page, verbatim from the capture attached to
 * issue #82. The variables sit in a `<script>` *after* `</html>`, which is the
 * shape the shared scraper expects.
 */
const NE200_LOGIN_PAGE =
  `<html><body>…</body></html>\n<script type="text/javascript"> var authTimes=0; var forbidFlag=0; var forbidTime=0; var modelName="NE200-Outdoor"; var modelDesc="5G Outdoor Router"; var locale_language="en_US"; var adminType="user"; var hasMobile="0";</script>`;

Deno.test("parseInfo reads the login page this firmware actually serves", () => {
  assertEquals(gdprJson.parseInfo(NE200_LOGIN_PAGE), {
    authTimes: 0,
    forbidFlag: 0,
    forbidTime: 0,
    modelName: "NE200-Outdoor",
    modelDesc: "5G Outdoor Router",
    locale_language: "en_US",
    adminType: "user",
    hasMobile: "0",
  });
});

Deno.test("parseInfo surfaces the account this firmware expects", () => {
  const info = gdprJson.parseInfo(NE200_LOGIN_PAGE);

  // `defaultUsername` is a fallback; the device states the real answer here,
  // and a provisioned device would report "admin" instead.
  assertEquals(info.adminType, "user");
  assertEquals(gdprJson.defaultUsername, "user");
});

Deno.test("publicKeyRequest posts to cgi/getGDPRParm", () => {
  const request = gdprJson.publicKeyRequest(BASE_URL);

  assertEquals(request.method, "POST");
  assertEquals(request.url, "http://192.168.254.1/cgi/getGDPRParm");
  assertEquals(request.headers.get("referer"), "http://192.168.254.1/");
  assertEquals(request.body, null);
});

Deno.test("encodeLogin base64-encodes credentials inside JSON", () => {
  const payload = gdprJson.encodeLogin({
    username: "user",
    password: "hunter2",
  });

  assertEquals(
    payload,
    '{"data":{"UserName":"dXNlcg==","Passwd":"aHVudGVyMg==","Action":"1",' +
      '"stack":"0,0,0,0,0,0","pstack":"0,0,0,0,0,0"},' +
      '"operation":"cgi","oid":"/cgi/login"}',
  );

  const parsed = JSON.parse(payload);
  assertEquals(atob(parsed.data.UserName), "user");
  assertEquals(atob(parsed.data.Passwd), "hunter2");
});

Deno.test("loginRequest posts the envelope to cgi_gdpr?9", async () => {
  const request = gdprJson.loginRequest(BASE_URL, ENVELOPE);

  assertEquals(request.method, "POST");
  assertEquals(request.url, "http://192.168.254.1/cgi_gdpr?9");
  assertEquals(new URL(request.url).search, "?9");
  assertEquals(request.headers.get("content-type"), "text/plain");
  assertEquals(request.headers.get("origin"), "http://192.168.254.1");
  assertEquals(request.headers.get("referer"), "http://192.168.254.1/");
  assertEquals(request.headers.get("x-requested-with"), "XMLHttpRequest");
  assertEquals(request.headers.get("cookie"), null);
  assertEquals(request.headers.get("tokenid"), null);
  assertEquals(await request.text(), "sign=00ff\r\ndata=ZGF0YQ==\r\n");
});

Deno.test("tokenRequest sends only the session cookie", () => {
  const request = gdprJson.tokenRequest(BASE_URL, {
    sessionId: "1B3A7C2E9F4D",
    authTimes: 3,
  });

  assertEquals(request.method, "GET");
  assertEquals(request.url, "http://192.168.254.1/");
  assertEquals(request.headers.get("cookie"), "JSESSIONID=1B3A7C2E9F4D");
});

Deno.test("encodeAction serializes a go read", () => {
  assertEquals(
    encodeAction([ACT.GET, "DEV2_LTE_LINK_CFG"]),
    '{"data":{"stack":"0,0,0,0,0,0","pstack":"0,0,0,0,0,0"},' +
      '"operation":"go","oid":"DEV2_LTE_LINK_CFG"}',
  );
});

Deno.test("encodeAction serializes a gl read with the list stack", () => {
  assertEquals(
    encodeAction([ACT.GL, "DEV2_LTE_SERVING_CELL_INFO"]),
    '{"data":{"stack":"0,0,0,0,0,0","pstack":"0,0,0,0,0,0"},' +
      '"operation":"gl","oid":"DEV2_LTE_SERVING_CELL_INFO"}',
  );
});

Deno.test("encodeAction turns requested attribute names into empty fields", () => {
  assertEquals(
    encodeAction([ACT.GET, "DEV2_MEM_STATUS", ["total", "free"]]),
    '{"data":{"total":"","free":"","stack":"0,0,0,0,0,0","pstack":"0,0,0,0,0,0"},' +
      '"operation":"go","oid":"DEV2_MEM_STATUS"}',
  );
});

Deno.test("encodeAction passes attribute values through", () => {
  assertEquals(
    encodeAction([ACT.CGI, "/cgi/logout", { Action: "1" }]),
    '{"data":{"Action":"1","stack":"0,0,0,0,0,0","pstack":"0,0,0,0,0,0"},' +
      '"operation":"cgi","oid":"/cgi/logout"}',
  );
});

Deno.test("encodeAction honours explicit stack and pStack", () => {
  assertEquals(
    encodeAction([ACT.GET, "DEV2_ADT_WAN", [], "2,0,0,0,0,0", "1,0,0,0,0,0"]),
    '{"data":{"stack":"2,0,0,0,0,0","pstack":"1,0,0,0,0,0"},' +
      '"operation":"go","oid":"DEV2_ADT_WAN"}',
  );
});

Deno.test("encodeAction throws for every unmapped write operation", () => {
  const unmapped = [ACT.SET, ACT.ADD, ACT.DEL, ACT.GS, ACT.OP] as const;

  for (const type of unmapped) {
    const error = assertThrows(
      () => encodeAction([type, "DEV2_WLAN", { ssid: "x" }]),
      Error,
    );
    assertStringIncludes(error.message, "no observed wire mapping");
    assertStringIncludes(error.message, String(type));
  }
});

Deno.test("encodeCommands emits one batch per action", () => {
  const actions: Action[] = [
    [ACT.GET, "DEV2_DEV_INFO"],
    [ACT.GL, "DEV2_LTE_SERVING_CELL_INFO"],
    [ACT.GET, "DEV2_CELL_INTF_USIM"],
  ];
  const batches = gdprJson.encodeCommands(actions);

  assertEquals(batches.length, 3);
  assertEquals(batches.map((batch) => batch.indices), [[0], [1], [2]]);
  assertEquals(batches[1].payload, encodeAction(actions[1]));
});

Deno.test("encodeCommands with no actions emits no round trips", () => {
  assertEquals(gdprJson.encodeCommands([]), []);
});

Deno.test("commandRequest carries session, token and the ?9 suffix", async () => {
  const request = gdprJson.commandRequest(BASE_URL, ENVELOPE, SESSION);

  assertEquals(request.method, "POST");
  assertEquals(request.url, "http://192.168.254.1/cgi_gdpr?9");
  assertEquals(request.headers.get("cookie"), "JSESSIONID=1B3A7C2E9F4D");
  assertEquals(request.headers.get("tokenid"), "d41d8cd98f");
  assertEquals(request.headers.get("content-type"), "text/plain");
  assertEquals(request.headers.get("origin"), "http://192.168.254.1");
  assertEquals(request.headers.get("x-requested-with"), "XMLHttpRequest");
  assertEquals(await request.text(), "sign=00ff\r\ndata=ZGF0YQ==\r\n");
});

Deno.test("decodeCommand normalizes a go response to one record", () => {
  const decoded = gdprJson.decodeCommand(GO_RESPONSE, {
    payload: "",
    indices: [0],
  });

  assertEquals(decoded.error, null);
  assertEquals(decoded.results, [{
    networkType: "9",
    signalStrength: "4",
    connectedBand: "n78",
  }]);
});

Deno.test("decodeCommand normalizes a gl response to a record list", () => {
  const decoded = gdprJson.decodeCommand(GL_RESPONSE, {
    payload: "",
    indices: [4],
  });

  assertEquals(decoded.error, null);
  assertEquals(decoded.results, [[
    { band: "n78", cellConnectionStatus: "1" },
    { band: "1", cellConnectionStatus: "0" },
  ]]);
});

Deno.test("decodeCommand stringifies non-string JSON values", () => {
  const decoded = gdprJson.decodeCommand(
    '{"success":true,"data":{"upTime":86400,"enabled":true}}',
    { payload: "", indices: [0] },
  );

  assertEquals(decoded.results, [{ upTime: "86400", enabled: "true" }]);
});

Deno.test("decodeCommand surfaces the router error code", () => {
  const decoded = gdprJson.decodeCommand(
    '{"success":false,"errorcode":71011}',
    { payload: "", indices: [0] },
  );

  assertEquals(decoded.error, 71011);
  assertEquals(decoded.results, [null]);
});

Deno.test("decodeCommand reads the plain-text reply of a cgi operation", () => {
  for (
    const body of ["$.ret=0", "$.ret=0;", "$.ret=0;\n", "\r\n$.ret=0;\r\n"]
  ) {
    const decoded = gdprJson.decodeCommand(body, { payload: "", indices: [0] });

    assertEquals(decoded.error, null);
    assertEquals(decoded.results, [null]);
  }
});

Deno.test("decodeCommand surfaces a non-zero plain-text return code", () => {
  const decoded = gdprJson.decodeCommand("$.ret=5;", {
    payload: "",
    indices: [0],
  });

  assertEquals(decoded.error, 5);
  assertEquals(decoded.results, [null]);
});

Deno.test("decodeCommand falls back to -1 for an unreadable plain-text reply", () => {
  const decoded = gdprJson.decodeCommand("<html>login page</html>", {
    payload: "",
    indices: [0],
  });

  assertEquals(decoded.error, -1);
  assertEquals(decoded.results, [null]);
});

Deno.test("decodeCommand falls back to -1 for an unrecognizable failure", () => {
  const decoded = gdprJson.decodeCommand('{"success":false}', {
    payload: "",
    indices: [0],
  });

  assertEquals(decoded.error, -1);
  assertEquals(decoded.results, [null]);
});
