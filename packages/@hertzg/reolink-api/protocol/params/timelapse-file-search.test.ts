import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { timelapseFileSearch } from "./timelapse-file-search.ts";

Deno.test("timelapseFileSearch decodes an mp4 page from net_timelapse_file_s2x", () => {
  const root = parse(
    '<timelapseFileSearch version="1.1"><channelId>0</channelId>' +
      "<handle>7</handle><totalNum>1</totalNum><finished>1</finished>" +
      "<uid>disk-uid-1</uid><id>task-one</id><taskType>mp4</taskType>" +
      "<item><original><id>video-one</id><fileName>video-one.mp4</fileName>" +
      "<resoHight>2160</resoHight><resowidth>3840</resowidth>" +
      "<size>5368709120</size><duration>90</duration>" +
      "<startTime><year>2026</year><month>10</month><day>9</day>" +
      "<hour>6</hour><minute>1</minute><second>2</second></startTime>" +
      "<endTime><year>2027</year><month>11</month><day>10</day>" +
      "<hour>18</hour><minute>3</minute><second>4</second></endTime>" +
      "</original></item></timelapseFileSearch>",
  ).root;

  assertEquals(timelapseFileSearch.decode(root), {
    channelId: 0,
    handle: 7,
    totalNum: 1,
    finished: 1,
    uid: "disk-uid-1",
    id: "task-one",
    taskType: "mp4",
    item: [{
      original: {
        id: "video-one",
        fileName: "video-one.mp4",
        resoHight: 2160,
        resowidth: 3840,
        size: 5368709120n,
        duration: 90,
        startTime: {
          year: 2026,
          month: 10,
          day: 9,
          hour: 6,
          minute: 1,
          second: 2,
        },
        endTime: {
          year: 2027,
          month: 11,
          day: 10,
          hour: 18,
          minute: 3,
          second: 4,
        },
      },
    }],
  });
});

Deno.test("timelapseFileSearch decodes a jpeg item with original and thumbnail", () => {
  const root = parse(
    '<timelapseFileSearch version="1.1"><taskType>jpeg</taskType><item>' +
      "<original><id>image-full</id><fileName>full.jpg</fileName>" +
      "<resoHight>1080</resoHight><resowidth>1920</resowidth><size>4096</size>" +
      "</original>" +
      "<thumbnail><id>image-thumb</id><fileName>thumb.jpg</fileName>" +
      "<resoHight>90</resoHight><resowidth>160</resowidth><size>512</size>" +
      "</thumbnail></item></timelapseFileSearch>",
  ).root;

  assertEquals(timelapseFileSearch.decode(root).item, [{
    original: {
      id: "image-full",
      fileName: "full.jpg",
      resoHight: 1080,
      resowidth: 1920,
      size: 4096n,
    },
    thumbnail: {
      id: "image-thumb",
      fileName: "thumb.jpg",
      resoHight: 90,
      resowidth: 160,
      size: 512n,
    },
  }]);
});

Deno.test("timelapseFileSearch round-trips a search request", () => {
  const value = {
    channelId: 1,
    uid: "disk-uid-2",
    id: "task-two",
    fromWhere: 2,
    startTime: { year: 2025, month: 1, day: 2, hour: 3, minute: 4, second: 5 },
    endTime: { year: 2025, month: 6, day: 7, hour: 8, minute: 9, second: 10 },
    taskType: "jpeg" as const,
  };

  assertEquals(
    timelapseFileSearch.decode(parse(timelapseFileSearch.encode(value)).root),
    value,
  );
});

Deno.test("timelapseFileSearch round-trips a result page", () => {
  const value = {
    handle: 3,
    totalNum: 2,
    finished: 0,
    item: [{
      original: {
        id: "file-a",
        fileName: "a.jpg",
        size: 18446744073709551615n,
      },
      thumbnail: { id: "file-a-thumb", fileName: "a-thumb.jpg", size: 1n },
    }],
  };

  assertEquals(
    timelapseFileSearch.decode(parse(timelapseFileSearch.encode(value)).root),
    value,
  );
});
