import { assertEquals } from "@std/assert";
import { buildCommand, commandToWords } from "./command.ts";

Deno.test("buildCommand - simple command", () => {
  const result = buildCommand("/login");
  assertEquals(result, ["/login"]);
});

Deno.test("buildCommand - with attributes", () => {
  const result = buildCommand("/login", {
    attributes: { name: "admin", password: "secret" },
  });
  assertEquals(result, ["/login", "=name=admin", "=password=secret"]);
});

Deno.test("buildCommand - with queries", () => {
  const result = buildCommand("/interface/print", {
    queries: { type: "ether", disabled: false },
  });
  assertEquals(result, [
    "/interface/print",
    "?type=ether",
    "?disabled=false",
  ]);
});

Deno.test("buildCommand - with attributes and queries", () => {
  const result = buildCommand("/interface/set", {
    attributes: { ".id": "*1", name: "ether1-new" },
    queries: { disabled: true },
  });
  assertEquals(result, [
    "/interface/set",
    "=.id=*1",
    "=name=ether1-new",
    "?disabled=true",
  ]);
});

Deno.test("buildCommand - numeric values", () => {
  const result = buildCommand("/interface/vlan/add", {
    attributes: { name: "vlan10", "vlan-id": 10, interface: "ether1" },
  });
  assertEquals(result, [
    "/interface/vlan/add",
    "=name=vlan10",
    "=vlan-id=10",
    "=interface=ether1",
  ]);
});

Deno.test("buildCommand - boolean values", () => {
  const result = buildCommand("/interface/set", {
    attributes: { ".id": "*1", disabled: false },
  });
  assertEquals(result, [
    "/interface/set",
    "=.id=*1",
    "=disabled=false",
  ]);
});

Deno.test("commandToWords - simple command", () => {
  const cmd = {
    command: "/system/resource/print",
  };
  const result = commandToWords(cmd);
  assertEquals(result, ["/system/resource/print"]);
});

Deno.test("commandToWords - full command", () => {
  const cmd = {
    command: "/interface/print",
    queries: { type: "ether" },
  };
  const result = commandToWords(cmd);
  assertEquals(result, [
    "/interface/print",
    "?type=ether",
  ]);
});

Deno.test("commandToWords - with all options", () => {
  const cmd = {
    command: "/interface/vlan/add",
    attributes: {
      name: "vlan20",
      "vlan-id": 20,
      interface: "ether1",
    },
  };
  const result = commandToWords(cmd);
  assertEquals(result, [
    "/interface/vlan/add",
    "=name=vlan20",
    "=vlan-id=20",
    "=interface=ether1",
  ]);
});

Deno.test("buildCommand - empty options", () => {
  const result = buildCommand("/interface/print", {});
  assertEquals(result, ["/interface/print"]);
});

Deno.test("buildCommand - complex commands", () => {
  const testcommands = [
    "/system/resource/print",
    "/ip/address/add",
    "/interface/wireless/security-profiles/set",
    "/tool/ping",
  ];

  for (const command of testcommands) {
    const result = buildCommand(command);
    assertEquals(result, [command]);
  }
});
