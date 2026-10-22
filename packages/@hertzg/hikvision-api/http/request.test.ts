import { assertEquals } from "@std/assert";
import { resolvesNext, spy } from "@std/testing/mock";
import { basicAuthorization, send } from "./request.ts";

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

Deno.test("send joins a baseUrl with trailing slash and port to the path", async () => {
  const fetch = spy(resolvesNext([new Response("<Time/>")]));

  await send(
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

Deno.test("send sets the Authorization header", async () => {
  const fetch = spy(resolvesNext([new Response("<Time/>")]));

  await send(
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

Deno.test("send keeps caller headers", async () => {
  const fetch = spy(resolvesNext([new Response("<Time/>")]));

  await send(
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

Deno.test("send keeps the caller's method, body and signal", async () => {
  const fetch = spy(resolvesNext([new Response("<Time/>")]));
  const controller = new AbortController();

  await send(
    {
      baseUrl: "http://192.0.2.10",
      username: "admin",
      password: "hunter2",
      fetch,
    },
    "/ISAPI/System/time",
    { method: "PUT", body: "<Time/>", signal: controller.signal },
  );

  const init = fetch.calls[0].args[1] as RequestInit;
  assertEquals(
    [init.method, init.body, init.signal],
    ["PUT", "<Time/>", controller.signal],
  );
});

Deno.test("send returns a failing response as is", async () => {
  const fetch = spy(resolvesNext([
    new Response("Unauthorized", { status: 401 }),
  ]));

  const response = await send(
    {
      baseUrl: "http://192.0.2.10",
      username: "admin",
      password: "hunter2",
      fetch,
    },
    "/ISAPI/System/time",
  );

  assertEquals([response.status, await response.text()], [401, "Unauthorized"]);
});
