import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { syncSsid } from "./sync-ssid.ts";

Deno.test("syncSsid decodes a request carrying both bands", () => {
  const root = parse(
    '<syncSSID version="1.1"><ssid2Dot4G>ssid-abc123</ssid2Dot4G>' +
      "<ssid5G>ssid-def456</ssid5G></syncSSID>",
  ).root;

  assertEquals(syncSsid.decode(root), {
    ssid2Dot4G: "ssid-abc123",
    ssid5G: "ssid-def456",
  });
});

Deno.test("syncSsid round-trips through encode and decode", () => {
  const value = { ssid2Dot4G: "ssid-ghi789 & co", ssid5G: "ssid-jkl012" };

  const xml = syncSsid.encode(value);

  assertEquals(syncSsid.decode(parse(xml).root), value);
});

Deno.test("syncSsid decodes a request for the 5 GHz band only", () => {
  const root = parse(
    '<syncSSID version="1.1"><ssid5G>ssid-mno345</ssid5G></syncSSID>',
  ).root;

  assertEquals(syncSsid.decode(root), { ssid5G: "ssid-mno345" });
});
