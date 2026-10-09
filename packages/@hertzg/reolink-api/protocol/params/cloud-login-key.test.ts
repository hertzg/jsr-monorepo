import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { cloudLoginKey } from "./cloud-login-key.ts";

Deno.test("cloudLoginKey decodes what nets_cloud_login_s2x writes", () => {
  const root = parse(
    '<CloudLoginKey version="1.1"><enable>1</enable></CloudLoginKey>',
  ).root;

  assertEquals(cloudLoginKey.decode(root), { enable: 1 });
});

Deno.test("cloudLoginKey round-trips enable", () => {
  const value = { enable: 0 };

  assertEquals(
    cloudLoginKey.decode(parse(cloudLoginKey.encode(value)).root),
    value,
  );
});

Deno.test("cloudLoginKey reads a missing enable as absent", () => {
  const root = parse('<CloudLoginKey version="1.1"></CloudLoginKey>').root;

  assertEquals(cloudLoginKey.decode(root), {});
});
