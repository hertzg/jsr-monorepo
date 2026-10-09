import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { deleteRecordFile } from "./delete-record-file.ts";

Deno.test("deleteRecordFile decodes a cmd 650 request", () => {
  const root = parse(
    '<DeleteRecordFile version="1.1"><chnbits>3</chnbits>' +
      "<streamType>1</streamType><bmerge>0</bmerge>" +
      "<startTime><year>2026</year><month>2</month><day>3</day>" +
      "<hour>4</hour><minute>5</minute><second>6</second></startTime>" +
      "<endTime><year>2026</year><month>7</month><day>8</day>" +
      "<hour>9</hour><minute>10</minute><second>11</second></endTime>" +
      "</DeleteRecordFile>",
  ).root;

  assertEquals(deleteRecordFile.decode(root), {
    chnbits: 3n,
    streamType: 1,
    bmerge: 0,
    startTime: { year: 2026, month: 2, day: 3, hour: 4, minute: 5, second: 6 },
    endTime: { year: 2026, month: 7, day: 8, hour: 9, minute: 10, second: 11 },
  });
});

Deno.test("deleteRecordFile reads a full 64-bit channel mask", () => {
  const root = parse(
    "<DeleteRecordFile><chnbits>18446744073709551615</chnbits></DeleteRecordFile>",
  ).root;

  assertEquals(deleteRecordFile.decode(root).chnbits, 18446744073709551615n);
});

Deno.test("deleteRecordFile round-trips through encode and decode", () => {
  const value = {
    chnbits: 5n,
    streamType: 2,
    bmerge: 1,
    startTime: { year: 2025, month: 1, day: 2, hour: 3, minute: 4, second: 5 },
    endTime: { year: 2025, month: 6, day: 7, hour: 8, minute: 9, second: 10 },
  };

  assertEquals(
    deleteRecordFile.decode(parse(deleteRecordFile.encode(value)).root),
    value,
  );
});
