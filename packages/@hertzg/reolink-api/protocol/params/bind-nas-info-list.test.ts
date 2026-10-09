import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { bindNasInfoList } from "./bind-nas-info-list.ts";

Deno.test("bindNasInfoList decodes what net_nas_bind_info_list_s2x writes", () => {
  const root = parse(
    '<BindNasInfoList version="1.1">' +
      "<info><devName>nas-one</devName><uid>uid-one</uid><bBinded>1</bBinded></info>" +
      "<info><devName>nas-two</devName><uid>uid-two</uid><bBinded>1</bBinded></info>" +
      "</BindNasInfoList>",
  ).root;

  assertEquals(bindNasInfoList.decode(root), {
    info: [
      { devName: "nas-one", uid: "uid-one", bBinded: 1 },
      { devName: "nas-two", uid: "uid-two", bBinded: 1 },
    ],
  });
});

Deno.test("bindNasInfoList round-trips a list", () => {
  const value = {
    info: [{ devName: "nas-three", uid: "uid-three", bBinded: 1 }],
  };

  assertEquals(
    bindNasInfoList.decode(parse(bindNasInfoList.encode(value)).root),
    value,
  );
});

Deno.test("bindNasInfoList reads a list with no <info> as absent", () => {
  const root = parse('<BindNasInfoList version="1.1"></BindNasInfoList>').root;

  assertEquals(bindNasInfoList.decode(root).info, undefined);
});
