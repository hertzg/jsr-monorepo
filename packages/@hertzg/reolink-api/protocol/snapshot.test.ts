import { assertEquals, assertThrows } from "@std/assert";
import { parseSnapshotSize, snapshotXml } from "./snapshot.ts";

Deno.test("snapshotXml asks for the current frame of a stream", () => {
  assertEquals(
    snapshotXml({ channel: 2, stream: "sub" }),
    '<?xml version="1.0" encoding="UTF-8" ?>\n' +
      "<body>\n" +
      '<Snap version="1.1">\n' +
      "<channelId>2</channelId>\n" +
      "<logicChannel>0</logicChannel>\n" +
      "<time>0</time>\n" +
      "<fullFrame>0</fullFrame>\n" +
      "<streamType>sub</streamType>\n" +
      "</Snap>\n" +
      "</body>\n",
  );
});

Deno.test("parseSnapshotSize reads pictureSize", () => {
  assertEquals(
    parseSnapshotSize(
      '<?xml version="1.0" encoding="UTF-8" ?>\n' +
        '<body><Snap version="1.1"><channelId>0</channelId>' +
        "<pictureSize>48213</pictureSize></Snap></body>",
    ),
    48213,
  );
});

Deno.test("parseSnapshotSize throws without a pictureSize element", () => {
  assertThrows(
    () => parseSnapshotSize("<body><Snap /></body>"),
    Error,
    "<pictureSize>",
  );
});
