import { assertEquals, assertThrows } from "@std/assert";
import { parsePrivacyMode, privacyModeXml } from "./privacy.ts";

Deno.test("privacyModeXml turns sleep on with operate 2", () => {
  assertEquals(
    privacyModeXml(true),
    '<?xml version="1.0" encoding="UTF-8" ?>\n' +
      "<body>\n" +
      '<sleepState version="1.1">\n' +
      "<operate>2</operate>\n" +
      "<sleep>1</sleep>\n" +
      "</sleepState>\n" +
      "</body>\n",
  );
});

Deno.test("parsePrivacyMode reads sleep 1 as on", () => {
  assertEquals(
    parsePrivacyMode(
      '<?xml version="1.0" encoding="UTF-8" ?>\n' +
        '<body><sleepState version="1.1"><sleep>1</sleep></sleepState></body>',
    ),
    true,
  );
});

Deno.test("parsePrivacyMode reads sleep 0 as off", () => {
  assertEquals(
    parsePrivacyMode("<body><sleepState><sleep>0</sleep></sleepState></body>"),
    false,
  );
});

Deno.test("parsePrivacyMode throws without a sleep element", () => {
  assertThrows(
    () => parsePrivacyMode("<body><sleepState /></body>"),
    Error,
    "<sleep>",
  );
});
