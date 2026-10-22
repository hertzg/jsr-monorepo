import { assertEquals, assertInstanceOf, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import {
  findResponseStatus,
  IsapiError,
  isOk,
  parseIsapi,
  parseResponseStatus,
} from "./status.ts";

Deno.test("parseIsapi returns the root of an ordinary document", () => {
  const root = parseIsapi("<Time><timeMode>NTP</timeMode></Time>");

  assertEquals(root.name.local, "Time");
});

Deno.test("parseIsapi throws IsapiError carrying the full status for notSupport", () => {
  const xml = "<ResponseStatus><requestURL>/ISAPI/Smart</requestURL>" +
    "<statusCode>4</statusCode><statusString>Invalid Operation</statusString>" +
    "<subStatusCode>notSupport</subStatusCode></ResponseStatus>";

  const error = assertThrows(() => parseIsapi(xml), IsapiError);

  assertEquals(
    [error.url, error.statusCode, error.statusString, error.subStatusCode],
    ["/ISAPI/Smart", 4, "Invalid Operation", "notSupport"],
  );
});

Deno.test("parseIsapi accepts statusCode 0", () => {
  const root = parseIsapi(
    "<ResponseStatus><statusCode>0</statusCode></ResponseStatus>",
  );

  assertEquals(root.name.local, "ResponseStatus");
});

Deno.test("parseIsapi accepts statusCode 1", () => {
  const root = parseIsapi(
    "<ResponseStatus><statusCode>1</statusCode></ResponseStatus>",
  );

  assertEquals(root.name.local, "ResponseStatus");
});

Deno.test("parseIsapi throws for statusCode 7", () => {
  assertThrows(
    () =>
      parseIsapi("<ResponseStatus><statusCode>7</statusCode></ResponseStatus>"),
    IsapiError,
  );
});

Deno.test("isOk is true only for statusCode 0 and 1", () => {
  assertEquals(
    [0, 1, 2, 4, 7].map((statusCode) => isOk({ statusCode })),
    [true, true, false, false, false],
  );
});

Deno.test("parseResponseStatus leaves absent optional fields out", () => {
  const root = parse(
    "<ResponseStatus><statusCode>4</statusCode></ResponseStatus>",
  ).root;

  assertEquals(parseResponseStatus(root), { statusCode: 4 });
});

Deno.test("findResponseStatus returns undefined for a body that is not XML", () => {
  assertEquals(findResponseStatus("Unauthorized"), undefined);
});

Deno.test("findResponseStatus returns undefined for another document", () => {
  assertEquals(
    findResponseStatus("<Time><timeMode>NTP</timeMode></Time>"),
    undefined,
  );
});

Deno.test("findResponseStatus returns the status of a ResponseStatus", () => {
  const xml = "<ResponseStatus><statusCode>4</statusCode>" +
    "<subStatusCode>notSupport</subStatusCode></ResponseStatus>";

  assertEquals(findResponseStatus(xml), {
    statusCode: 4,
    subStatusCode: "notSupport",
  });
});

Deno.test("IsapiError message names the url, code and reason from the body alone", () => {
  const error = new IsapiError({
    status: {
      requestURL: "/ISAPI/Smart",
      statusCode: 4,
      subStatusCode: "notSupport",
    },
  });

  assertEquals(error.message, "ISAPI /ISAPI/Smart failed: 4 notSupport");
});

Deno.test("IsapiError message names the HTTP status and the body when both are known", () => {
  const error = new IsapiError({
    url: "http://192.0.2.10/ISAPI/Smart",
    httpStatus: 403,
    status: { statusCode: 4, subStatusCode: "notSupport" },
  });

  assertEquals(
    error.message,
    "ISAPI http://192.0.2.10/ISAPI/Smart failed: HTTP 403, 4 notSupport",
  );
});

Deno.test("IsapiError message names only the HTTP status when there was no body", () => {
  const error = new IsapiError({
    url: "http://192.0.2.10/ISAPI/System/time",
    httpStatus: 401,
  });

  assertEquals(
    error.message,
    "ISAPI http://192.0.2.10/ISAPI/System/time failed: HTTP 401",
  );
});

Deno.test("IsapiError is an Error", () => {
  const error = new IsapiError({ status: { statusCode: 7 } });

  assertInstanceOf(error, Error);
});
