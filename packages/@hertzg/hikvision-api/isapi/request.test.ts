import { assertEquals, assertRejects } from "@std/assert";
import { resolvesNext, spy } from "@std/testing/mock";
import { document, text } from "./document.ts";
import {
  basicAuthorization,
  readDocument,
  request,
  requestXml,
} from "./request.ts";
import { IsapiError } from "./status.ts";

Deno.test("basicAuthorization encodes username:password as base64", () => {
  assertEquals(
    basicAuthorization("admin", "hunter2"),
    "Basic YWRtaW46aHVudGVyMg==",
  );
});

Deno.test("basicAuthorization encodes a non-Latin-1 password as UTF-8", () => {
  assertEquals(
    basicAuthorization("admin", "pässwörd€"),
    "Basic YWRtaW46cMOkc3N3w7ZyZOKCrA==",
  );
});

Deno.test("request joins a baseUrl with trailing slash and port to the path", async () => {
  const fetch = spy(resolvesNext([new Response("<Time/>")]));

  await request(
    {
      baseUrl: "http://192.0.2.10:65001/",
      username: "admin",
      password: "hunter2",
      fetch,
    },
    "/ISAPI/System/time",
  );

  assertEquals(
    fetch.calls[0].args[0],
    "http://192.0.2.10:65001/ISAPI/System/time",
  );
});

Deno.test("request sets the Authorization header", async () => {
  const fetch = spy(resolvesNext([new Response("<Time/>")]));

  await request(
    {
      baseUrl: "http://192.0.2.10",
      username: "admin",
      password: "hunter2",
      fetch,
    },
    "/ISAPI/System/time",
  );

  const headers = fetch.calls[0].args[1]?.headers as Headers;
  assertEquals(headers.get("authorization"), "Basic YWRtaW46aHVudGVyMg==");
});

Deno.test("request keeps caller headers", async () => {
  const fetch = spy(resolvesNext([new Response("<Time/>")]));

  await request(
    {
      baseUrl: "http://192.0.2.10",
      username: "admin",
      password: "hunter2",
      fetch,
    },
    "/ISAPI/System/time",
    { headers: { "content-type": "application/xml" } },
  );

  const headers = fetch.calls[0].args[1]?.headers as Headers;
  assertEquals(headers.get("content-type"), "application/xml");
});

Deno.test("request keeps the caller's signal", async () => {
  const fetch = spy(resolvesNext([new Response("<Time/>")]));
  const controller = new AbortController();

  await request(
    {
      baseUrl: "http://192.0.2.10",
      username: "admin",
      password: "hunter2",
      fetch,
    },
    "/ISAPI/System/time",
    { signal: controller.signal },
  );

  assertEquals(fetch.calls[0].args[1]?.signal, controller.signal);
});

Deno.test("request turns a 403 ResponseStatus into IsapiError with the HTTP status", async () => {
  const fetch = spy(resolvesNext([
    new Response(
      "<ResponseStatus><statusCode>4</statusCode>" +
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
        "/ISAPI/Smart/FieldDetection/1",
      ),
    IsapiError,
  );

  assertEquals(
    [error.subStatusCode, error.httpStatus],
    ["notSupport", 403],
  );
});

Deno.test("request turns a 400 badParameters ResponseStatus into IsapiError", async () => {
  const fetch = spy(resolvesNext([
    new Response(
      "<ResponseStatus><statusCode>5</statusCode>" +
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
      ),
    IsapiError,
  );

  assertEquals(error.httpStatus, 400);
});

Deno.test("request turns a 401 with a non-XML body into IsapiError with the HTTP status and url", async () => {
  const fetch = spy(resolvesNext([
    new Response("Unauthorized", { status: 401 }),
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
      ),
    IsapiError,
  );

  assertEquals(
    [error.httpStatus, error.statusCode, error.url],
    [401, undefined, "http://192.0.2.10/ISAPI/System/time"],
  );
});

Deno.test("requestXml parses a reply into its root element", async () => {
  const fetch = spy(resolvesNext([
    new Response("<Time><timeMode>NTP</timeMode></Time>"),
  ]));

  const root = await requestXml(
    {
      baseUrl: "http://192.0.2.10",
      username: "admin",
      password: "hunter2",
      fetch,
    },
    "/ISAPI/System/time",
  );

  assertEquals(root.name.local, "Time");
});

Deno.test("requestXml throws IsapiError on a 200 ResponseStatus with statusCode 7", async () => {
  const fetch = spy(resolvesNext([
    new Response(
      "<ResponseStatus><statusCode>7</statusCode></ResponseStatus>",
    ),
  ]));

  await assertRejects(
    () =>
      requestXml(
        {
          baseUrl: "http://192.0.2.10",
          username: "admin",
          password: "hunter2",
          fetch,
        },
        "/ISAPI/System/time",
      ),
    IsapiError,
  );
});

Deno.test("readDocument decodes the reply with the codec", async () => {
  const fetch = spy(resolvesNext([
    new Response("<DeviceInfo><model>DS-7608NI-Q2/8P</model></DeviceInfo>"),
  ]));

  const info = await readDocument(
    {
      baseUrl: "http://192.0.2.10",
      username: "admin",
      password: "hunter2",
      fetch,
    },
    "/ISAPI/System/deviceInfo",
    document({ model: text() }),
  );

  assertEquals(info, { model: "DS-7608NI-Q2/8P" });
});

Deno.test("readDocument rejects with the engine's missing-element message", async () => {
  const fetch = spy(resolvesNext([new Response("<DeviceInfo/>")]));

  await assertRejects(
    () =>
      readDocument(
        {
          baseUrl: "http://192.0.2.10",
          username: "admin",
          password: "hunter2",
          fetch,
        },
        "/ISAPI/System/deviceInfo",
        document({ model: text() }),
      ),
    Error,
    "ISAPI <DeviceInfo> has no <model>",
  );
});
