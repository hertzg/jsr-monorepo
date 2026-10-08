import { assertEquals } from "@std/assert";
import { sirenXml } from "./siren.ts";

Deno.test("sirenXml plays a number of times in play mode 0", () => {
  assertEquals(
    sirenXml({ channel: 0, times: 3 }),
    '<?xml version="1.0" encoding="UTF-8" ?>\n' +
      "<body>\n" +
      '<audioPlayInfo version="1.1">\n' +
      "<channelId>0</channelId>\n" +
      "<playMode>0</playMode>\n" +
      "<playDuration>10</playDuration>\n" +
      "<playTimes>3</playTimes>\n" +
      "<onOff>1</onOff>\n" +
      "</audioPlayInfo>\n" +
      "</body>\n",
  );
});

Deno.test("sirenXml stops manual play in play mode 2", () => {
  assertEquals(
    sirenXml({ channel: 1, on: false }),
    '<?xml version="1.0" encoding="UTF-8" ?>\n' +
      "<body>\n" +
      '<audioPlayInfo version="1.1">\n' +
      "<channelId>1</channelId>\n" +
      "<playMode>2</playMode>\n" +
      "<playDuration>10</playDuration>\n" +
      "<playTimes>1</playTimes>\n" +
      "<onOff>0</onOff>\n" +
      "</audioPlayInfo>\n" +
      "</body>\n",
  );
});

Deno.test("sirenXml leaves out channelId for the device itself", () => {
  assertEquals(
    sirenXml({ on: true }),
    '<?xml version="1.0" encoding="UTF-8" ?>\n' +
      "<body>\n" +
      '<audioPlayInfo version="1.1">\n' +
      "<playMode>2</playMode>\n" +
      "<playDuration>10</playDuration>\n" +
      "<playTimes>1</playTimes>\n" +
      "<onOff>1</onOff>\n" +
      "</audioPlayInfo>\n" +
      "</body>\n",
  );
});
