import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { ddns } from "./ddns.ts";

Deno.test("ddns decodes the cmd 40 reply element", () => {
  const root = parse(
    '<Ddns version="1.1"><enable>1</enable><ddnsType>3322</ddnsType>' +
      "<ddnsName>cam.example.net</ddnsName><userName>ddns-user</userName>" +
      "<password>ddns-secret</password></Ddns>",
  ).root;

  assertEquals(ddns.decode(root), {
    enable: 1,
    ddnsType: "3322",
    ddnsName: "cam.example.net",
    userName: "ddns-user",
    password: "ddns-secret",
  });
});

Deno.test("ddns round-trips every field", () => {
  const value = {
    enable: 0,
    ddnsType: "swann",
    ddnsName: "home.example.org",
    userName: "account-name",
    password: "account-password",
  } as const;

  assertEquals(ddns.decode(parse(ddns.encode(value)).root), value);
});

Deno.test("ddns rejects a provider outside the firmware list", () => {
  const root = parse(
    '<Ddns version="1.1"><ddnsType>duckdns</ddnsType></Ddns>',
  ).root;

  assertThrows(() => ddns.decode(root), Error, '"duckdns"');
});
