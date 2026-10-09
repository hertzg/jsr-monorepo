import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { versionInfo } from "./version-info.ts";

Deno.test("versionInfo decodes a reply with every field the handler writes", () => {
  const root = parse(
    '<VersionInfo version="1.1"><name>Front door</name><type>IPC</type>' +
      "<serialNumber>serial-abc123</serialNumber><buildDay>build 23110119</buildDay>" +
      "<hardwareVersion>IPC_523SD10</hardwareVersion><cfgVersion>v3.1.0.0</cfgVersion>" +
      "<firmwareVersion>v3.1.0.2898_23110119</firmwareVersion><detail>detail-abc123</detail>" +
      "<IEClient>ie-abc123</IEClient><pakSuffix>pak</pakSuffix>" +
      "<anotherPakSuffix>paks</anotherPakSuffix><helpVersion>help-abc123</helpVersion>" +
      "</VersionInfo>",
  ).root;

  assertEquals(versionInfo.decode(root), {
    name: "Front door",
    type: "IPC",
    serialNumber: "serial-abc123",
    buildDay: "build 23110119",
    hardwareVersion: "IPC_523SD10",
    cfgVersion: "v3.1.0.0",
    firmwareVersion: "v3.1.0.2898_23110119",
    detail: "detail-abc123",
    IEClient: "ie-abc123",
    pakSuffix: "pak",
    anotherPakSuffix: "paks",
    helpVersion: "help-abc123",
  });
});

Deno.test("versionInfo round-trips through encode and decode", () => {
  const value = {
    name: "name-rt",
    type: "type-rt",
    serialNumber: "serial-rt",
    buildDay: "build-rt",
    hardwareVersion: "hw-rt",
    cfgVersion: "cfg-rt",
    firmwareVersion: "fw-rt",
    detail: "detail-rt",
    IEClient: "ie-rt",
    pakSuffix: "pak-rt",
    anotherPakSuffix: "another-rt",
    helpVersion: "help-rt",
  };

  assertEquals(
    versionInfo.decode(parse(versionInfo.encode(value)).root),
    value,
  );
});

Deno.test("versionInfo decodes a reply without the conditional fields", () => {
  const root = parse(
    '<VersionInfo version="1.1"><name>n</name><type>t</type>' +
      "<serialNumber>s</serialNumber><buildDay>b</buildDay>" +
      "<hardwareVersion>h</hardwareVersion><cfgVersion>c</cfgVersion>" +
      "<firmwareVersion>f</firmwareVersion><detail>d</detail>" +
      "<IEClient>i</IEClient><pakSuffix>p</pakSuffix></VersionInfo>",
  ).root;

  assertEquals("anotherPakSuffix" in versionInfo.decode(root), false);
});

Deno.test("versionInfo throws when an always-written field is missing", () => {
  const root = parse('<VersionInfo version="1.1"><name>n</name></VersionInfo>')
    .root;

  assertThrows(() => versionInfo.decode(root), Error, "<type>");
});
