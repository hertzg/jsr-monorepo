import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { onlineNewFirmwareInfo } from "./online-new-firmware-info.ts";

Deno.test("onlineNewFirmwareInfo decodes the cmd 197 reply", () => {
  const root = parse(
    '<OnlineNewFirmwareInfo version="1.1"><hasNewFirmware>1</hasNewFirmware>' +
      "</OnlineNewFirmwareInfo>",
  ).root;

  assertEquals(onlineNewFirmwareInfo.decode(root), { hasNewFirmware: 1 });
});

Deno.test("onlineNewFirmwareInfo rejects a reply without hasNewFirmware", () => {
  const root = parse(
    '<OnlineNewFirmwareInfo version="1.1"></OnlineNewFirmwareInfo>',
  ).root;

  assertThrows(
    () => onlineNewFirmwareInfo.decode(root),
    Error,
    "<hasNewFirmware>",
  );
});

Deno.test("onlineNewFirmwareInfo round-trips through encode and decode", () => {
  const value = { hasNewFirmware: 0 };

  const xml = onlineNewFirmwareInfo.encode(value);

  assertEquals(onlineNewFirmwareInfo.decode(parse(xml).root), value);
});
