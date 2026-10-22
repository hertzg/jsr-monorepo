import { assertEquals, assertRejects } from "@std/assert";
import { resolvesNext, spy } from "@std/testing/mock";
import { document, text } from "./document.ts";
import { request } from "./request.ts";
import { IsapiError } from "./status.ts";

const DEVICE = {
  baseUrl: "http://192.0.2.10",
  username: "admin",
  password: "hunter2",
};

Deno.test("request with a path returns the response as is", async () => {
  const fetch = spy(resolvesNext([
    new Response("Unauthorized", { status: 401 }),
  ]));

  const response = await request(
    { ...DEVICE, fetch },
    "/ISAPI/System/time",
    { method: "GET" },
  );

  assertEquals([response.status, await response.text()], [401, "Unauthorized"]);
  assertEquals(fetch.calls[0].args[0], "http://192.0.2.10/ISAPI/System/time");
});

Deno.test("request with a resource decodes the reply with its codec", async () => {
  const fetch = spy(resolvesNext([
    new Response("<DeviceInfo><model>DS-7608NI-Q2/8P</model></DeviceInfo>"),
  ]));

  const info = await request(
    { ...DEVICE, fetch },
    { path: "/ISAPI/System/deviceInfo", codec: document({ model: text() }) },
  );

  assertEquals(info, { model: "DS-7608NI-Q2/8P" });
  assertEquals(
    fetch.calls[0].args[0],
    "http://192.0.2.10/ISAPI/System/deviceInfo",
  );
});

Deno.test("request with a resource sends the credentials", async () => {
  const fetch = spy(resolvesNext([new Response("<Time><a>1</a></Time>")]));

  await request(
    { ...DEVICE, fetch },
    { path: "/ISAPI/System/time", codec: document({ a: text() }) },
  );

  const init = fetch.calls[0].args[1] as RequestInit;
  assertEquals(
    new Headers(init.headers).get("authorization"),
    "Basic YWRtaW46aHVudGVyMg==",
  );
});

Deno.test("request with a resource passes init through", async () => {
  const fetch = spy(resolvesNext([new Response("<Time><a>1</a></Time>")]));

  await request(
    { ...DEVICE, fetch },
    { path: "/ISAPI/System/time", codec: document({ a: text() }) },
    { method: "PUT", body: "<Time><a>1</a></Time>" },
  );

  const init = fetch.calls[0].args[1] as RequestInit;
  assertEquals([init.method, init.body], ["PUT", "<Time><a>1</a></Time>"]);
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
        { ...DEVICE, fetch },
        { path: "/ISAPI/Smart/FieldDetection/1", codec: document({}) },
      ),
    IsapiError,
  );

  assertEquals([error.subStatusCode, error.httpStatus], ["notSupport", 403]);
});

Deno.test("request turns a 401 with a non-XML body into IsapiError with the HTTP status and url", async () => {
  const fetch = spy(resolvesNext([
    new Response("Unauthorized", { status: 401 }),
  ]));

  const error = await assertRejects(
    () =>
      request(
        { ...DEVICE, fetch },
        { path: "/ISAPI/System/time", codec: document({}) },
      ),
    IsapiError,
  );

  assertEquals(
    [error.httpStatus, error.statusCode, error.url],
    [401, undefined, "http://192.0.2.10/ISAPI/System/time"],
  );
});

Deno.test("request throws IsapiError on a 200 ResponseStatus with statusCode 7", async () => {
  const fetch = spy(resolvesNext([
    new Response("<ResponseStatus><statusCode>7</statusCode></ResponseStatus>"),
  ]));

  await assertRejects(
    () =>
      request(
        { ...DEVICE, fetch },
        { path: "/ISAPI/System/time", codec: document({}) },
      ),
    IsapiError,
  );
});

Deno.test("request rejects with the engine's missing-element message", async () => {
  const fetch = spy(resolvesNext([new Response("<DeviceInfo/>")]));

  await assertRejects(
    () =>
      request(
        { ...DEVICE, fetch },
        {
          path: "/ISAPI/System/deviceInfo",
          codec: document({ model: text() }),
        },
      ),
    Error,
    "ISAPI <DeviceInfo> has no <model>",
  );
});
