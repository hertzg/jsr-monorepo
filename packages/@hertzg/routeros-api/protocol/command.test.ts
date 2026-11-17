import { test } from "node:test";
import { assertEquals } from "@std/assert";
import { buildCommand, commandToWords } from "./command.ts";

test("buildCommand - simple command", () => {
  const result = buildCommand("/login");
  assertEquals(result, ["/login"]);
});

test("buildCommand - .tag attribute", () => {
  const result = buildCommand("/system/identity/set", {
    attributes: { ".tag": "session123", name: "MyRouter" },
  });
  assertEquals(result, [
    "/system/identity/set",
    ".tag=session123",
    "=name=MyRouter",
  ]);
});

test("buildCommand - with attributes", () => {
  const result = buildCommand("/login", {
    attributes: { name: "admin", password: "secret" },
  });
  assertEquals(result, ["/login", "=name=admin", "=password=secret"]);
});

test("buildCommand - with queries", () => {
  const result = buildCommand("/interface/print", {
    queries: { type: "ether", disabled: false },
  });
  assertEquals(result, [
    "/interface/print",
    "?type=ether",
    "?disabled=false",
  ]);
});

test("buildCommand - with attributes and queries", () => {
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

test("buildCommand - numeric values", () => {
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

test("buildCommand - boolean values", () => {
  const result = buildCommand("/interface/set", {
    attributes: { ".id": "*1", disabled: false },
  });
  assertEquals(result, [
    "/interface/set",
    "=.id=*1",
    "=disabled=false",
  ]);
});

test("commandToWords - simple command", () => {
  const cmd = {
    command: "/system/resource/print",
  };
  const result = commandToWords(cmd);
  assertEquals(result, ["/system/resource/print"]);
});

test("commandToWords - full command", () => {
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

test("commandToWords - with all options", () => {
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

test("buildCommand - empty options", () => {
  const result = buildCommand("/interface/print", {});
  assertEquals(result, ["/interface/print"]);
});

test("buildCommand - complex commands", () => {
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
