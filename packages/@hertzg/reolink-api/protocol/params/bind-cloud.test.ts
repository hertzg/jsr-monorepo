import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { bindCloud } from "./bind-cloud.ts";

Deno.test("bindCloud decodes the request nets_bind_cloud_x2s reads", () => {
  const root = parse(
    '<BindCloud version="1.1"><authToken>token-abc123</authToken></BindCloud>',
  ).root;

  assertEquals(bindCloud.decode(root), { authToken: "token-abc123" });
});

Deno.test("bindCloud round-trips a token with XML special characters", () => {
  const value = { authToken: "a<b>&c" };

  assertEquals(bindCloud.decode(parse(bindCloud.encode(value)).root), value);
});

Deno.test("bindCloud decodes an empty element", () => {
  const root = parse('<BindCloud version="1.1"></BindCloud>').root;

  assertEquals(bindCloud.decode(root), {});
});
