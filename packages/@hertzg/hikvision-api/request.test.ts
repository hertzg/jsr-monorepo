import { assertEquals, assertRejects } from "@std/assert";
import { assertSpyCalls, resolvesNext, spy } from "@std/testing/mock";
import {
  basicAuthorization,
  HttpError,
  request,
  requestXml,
} from "./request.ts";
import { IsapiError } from "./xml.ts";

Deno.test("basicAuthorization encodes user:password in base64", () => {
  assertEquals(
    basicAuthorization("admin", "hunter2"),
    "Basic YWRtaW46aHVudGVyMg==",
  );
});

Deno.test("basicAuthorization handles a password outside Latin-1", () => {
  assertEquals(
    basicAuthorization("admin", "pässwörd€"),
    "Basic YWRtaW46cMOkc3N3w7ZyZOKCrA==",
  );
});

Deno.test("request joins the base URL and path and adds the Authorization header", async () => {
  const fetch = spy(resolvesNext([new Response("")]));

  await request(
    {
      baseUrl: "http://192.0.2.10:65001/",
      username: "admin",
      password: "hunter2",
      fetch,
    },
    "/ISAPI/System/deviceInfo",
  );

  assertSpyCalls(fetch, 1);
  assertEquals(
    fetch.calls[0].args[0],
    "http://192.0.2.10:65001/ISAPI/System/deviceInfo",
  );
  const init = fetch.calls[0].args[1] as RequestInit;
  assertEquals(
    new Headers(init.headers).get("authorization"),
    "Basic YWRtaW46aHVudGVyMg==",
  );
});

Deno.test("request keeps the caller's headers and signal", async () => {
  const fetch = spy(resolvesNext([new Response("")]));
  const controller = new AbortController();

  await request(
    {
      baseUrl: "http://192.0.2.10",
      username: "admin",
      password: "hunter2",
      fetch,
    },
    "/ISAPI/System/deviceInfo",
    { headers: { accept: "application/xml" }, signal: controller.signal },
  );

  const init = fetch.calls[0].args[1] as RequestInit;
  assertEquals(new Headers(init.headers).get("accept"), "application/xml");
  assertEquals(init.signal, controller.signal);
});

Deno.test("request throws HttpError with the status and URL on 401 with a non-XML body", async () => {
  const fetch = spy(
    resolvesNext([new Response("Unauthorized", { status: 401 })]),
  );

  const error = await assertRejects(
    () =>
      request(
        {
          baseUrl: "http://192.0.2.10",
          username: "admin",
          password: "wrong",
          fetch,
        },
        "/ISAPI/System/deviceInfo",
      ),
    HttpError,
  );

  assertEquals(error.status, 401);
  assertEquals(error.url, "http://192.0.2.10/ISAPI/System/deviceInfo");
});

Deno.test("request throws HttpError when the non-2xx body is XML but not a ResponseStatus", async () => {
  const fetch = spy(
    resolvesNext([
      new Response("<html><body>Not Found</body></html>", { status: 404 }),
    ]),
  );

  const error = await assertRejects(
    () =>
      request(
        {
          baseUrl: "http://192.0.2.10",
          username: "admin",
          password: "hunter2",
          fetch,
        },
        "/ISAPI/Nope",
      ),
    HttpError,
  );

  assertEquals(error.status, 404);
});

Deno.test("request throws IsapiError with httpStatus on 403 with a ResponseStatus body", async () => {
  const fetch = spy(resolvesNext([
    new Response(
      '<?xml version="1.0" encoding="UTF-8"?>' +
        '<ResponseStatus version="2.0" xmlns="http://www.hikvision.com/ver20/XMLSchema">' +
        "<requestURL>/ISAPI/Smart/LineDetection/1</requestURL>" +
        "<statusCode>4</statusCode><statusString>Invalid Operation</statusString>" +
        "<subStatusCode>notSupport</subStatusCode></ResponseStatus>",
      { status: 403 },
    ),
  ]));

  const error = await assertRejects(
    () =>
      request(
        {
          baseUrl: "http://192.0.2.10",
          username: "admin",
          password: "hunter2",
          fetch,
        },
        "/ISAPI/Smart/LineDetection/1",
      ),
    IsapiError,
  );

  assertEquals(error.httpStatus, 403);
  assertEquals(error.status.subStatusCode, "notSupport");
});

Deno.test("request throws IsapiError with httpStatus on 400 with badParameters", async () => {
  const fetch = spy(resolvesNext([
    new Response(
      "<ResponseStatus><statusCode>6</statusCode>" +
        "<subStatusCode>badParameters</subStatusCode></ResponseStatus>",
      { status: 400 },
    ),
  ]));

  const error = await assertRejects(
    () =>
      request(
        {
          baseUrl: "http://192.0.2.10",
          username: "admin",
          password: "hunter2",
          fetch,
        },
        "/ISAPI/System/time",
        { method: "PUT", body: "<Time/>" },
      ),
    IsapiError,
  );

  assertEquals(error.httpStatus, 400);
  assertEquals(error.status.statusCode, 6);
});

Deno.test("requestXml parses the reply", async () => {
  const fetch = spy(resolvesNext([
    new Response("<DeviceInfo><model>DS-2CD2043G2-I</model></DeviceInfo>"),
  ]));

  const root = await requestXml(
    {
      baseUrl: "http://192.0.2.21",
      username: "admin",
      password: "hunter2",
      fetch,
    },
    "/ISAPI/System/deviceInfo",
  );

  assertEquals(root.name.local, "DeviceInfo");
});

Deno.test("requestXml returns a ResponseStatus with statusCode 0 on HTTP 200", async () => {
  const fetch = spy(resolvesNext([
    new Response(
      "<ResponseStatus><statusCode>0</statusCode><statusString>OK</statusString></ResponseStatus>",
    ),
  ]));

  const root = await requestXml(
    {
      baseUrl: "http://192.0.2.21",
      username: "admin",
      password: "hunter2",
      fetch,
    },
    "/ISAPI/System/reboot",
    { method: "PUT" },
  );

  assertEquals(root.name.local, "ResponseStatus");
});

Deno.test("requestXml throws IsapiError on statusCode 7 with HTTP 200", async () => {
  const fetch = spy(resolvesNext([
    new Response(
      "<ResponseStatus><statusCode>7</statusCode><subStatusCode>rebootRequired</subStatusCode></ResponseStatus>",
    ),
  ]));

  const error = await assertRejects(
    () =>
      requestXml(
        {
          baseUrl: "http://192.0.2.21",
          username: "admin",
          password: "hunter2",
          fetch,
        },
        "/ISAPI/System/Network/interfaces/1",
        { method: "PUT", body: "<NetworkInterface/>" },
      ),
    IsapiError,
  );

  assertEquals(error.status.statusCode, 7);
  assertEquals(error.httpStatus, undefined);
});

Deno.test("requestXml throws IsapiError on a failing ResponseStatus with HTTP 200", async () => {
  const fetch = spy(resolvesNext([
    new Response(
      "<ResponseStatus><statusCode>4</statusCode><subStatusCode>notSupport</subStatusCode></ResponseStatus>",
    ),
  ]));

  await assertRejects(
    () =>
      requestXml(
        {
          baseUrl: "http://192.0.2.21",
          username: "admin",
          password: "hunter2",
          fetch,
        },
        "/ISAPI/Smart/LineDetection/1",
      ),
    IsapiError,
    "notSupport",
  );
});
