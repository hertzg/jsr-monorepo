import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { timelapseDateTbl } from "./timelapse-date-tbl.ts";

Deno.test("timelapseDateTbl decodes what net_timelapse_date_s2x writes", () => {
  const root = parse(
    '<timelapseDateTbl version="1.1"><channelId>0</channelId>' +
      "<uid>disk-uid-1</uid><id>task-one</id>" +
      "<item><year>2025</year><dateTable>table-2025</dateTable></item>" +
      "<item><year>2026</year><dateTable>table-2026</dateTable></item>" +
      "</timelapseDateTbl>",
  ).root;

  assertEquals(timelapseDateTbl.decode(root), {
    channelId: 0,
    uid: "disk-uid-1",
    id: "task-one",
    item: [
      { year: 2025, dateTable: "table-2025" },
      { year: 2026, dateTable: "table-2026" },
    ],
  });
});

Deno.test("timelapseDateTbl round-trips every field", () => {
  const value = {
    channelId: 1,
    uid: "disk-uid-2",
    id: "task-two",
    item: [{ year: 2027, dateTable: "table-2027" }],
  };

  assertEquals(
    timelapseDateTbl.decode(parse(timelapseDateTbl.encode(value)).root),
    value,
  );
});
