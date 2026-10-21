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

Deno.test("request throws HttpError with the status and URL on 401", async () => {
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
