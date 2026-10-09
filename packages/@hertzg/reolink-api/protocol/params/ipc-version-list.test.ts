import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { ipcVersionList } from "./ipc-version-list.ts";

Deno.test("ipcVersionList decodes every IpcVersion entry", () => {
  const root = parse(
    '<IpcVersionList version="1.1">' +
      "<IpcVersion><platform>platform-a</platform><version>version-a</version>" +
      "<url>http://example.test/a</url></IpcVersion>" +
      "<IpcVersion><platform>platform-b</platform></IpcVersion>" +
      "</IpcVersionList>",
  ).root;

  assertEquals(ipcVersionList.decode(root), {
    IpcVersion: [
      {
        platform: "platform-a",
        version: "version-a",
        url: "http://example.test/a",
      },
      { platform: "platform-b" },
    ],
  });
});

Deno.test("ipcVersionList round-trips through encode and decode", () => {
  const value = {
    IpcVersion: [{
      platform: "platform-c",
      version: "version-c",
      url: "http://example.test/c",
    }],
  };

  assertEquals(
    ipcVersionList.decode(parse(ipcVersionList.encode(value)).root),
    value,
  );
});

Deno.test("ipcVersionList reads an empty list as no entries", () => {
  const root = parse('<IpcVersionList version="1.1"></IpcVersionList>').root;

  assertEquals(ipcVersionList.decode(root), { IpcVersion: [] });
});
