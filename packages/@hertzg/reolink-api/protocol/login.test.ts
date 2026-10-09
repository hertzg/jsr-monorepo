import { assertEquals, assertThrows } from "@std/assert";
import { loginCredentials, loginXml, md5Modern, parseNonce } from "./login.ts";

Deno.test("md5Modern matches reolink_aio md5_str_modern", () => {
  assertEquals(md5Modern("adminNONCE-0123"), "329F51D2942C5953794C5C99EB43D46");
});

Deno.test("md5Modern drops the last hex digit and upper-cases", () => {
  assertEquals(md5Modern("").length, 31);
  assertEquals(md5Modern(""), "D41D8CD98F00B204E9800998ECF8427");
});

Deno.test("loginCredentials hashes the username and password with the nonce", () => {
  const credentials = loginCredentials({
    username: "admin",
    password: "hunter2",
    nonce: "NONCE-0123",
  });

  assertEquals(credentials.userHash, "329F51D2942C5953794C5C99EB43D46");
  assertEquals(credentials.passwordHash, "FD2634D6B9FAC14C2C00CE885DE8CFA");
});

Deno.test("loginCredentials derives the AES key from nonce and password", () => {
  const credentials = loginCredentials({
    username: "admin",
    password: "hunter2",
    nonce: "NONCE-0123",
  });

  assertEquals(
    credentials.aesKey,
    new TextEncoder().encode("08822D7143979103"),
  );
});

Deno.test("loginXml places the hashes in LoginUser", () => {
  const userHash = "user-hash-abc123";
  const passwordHash = "password-hash-def456";

  assertEquals(
    loginXml({ userHash, passwordHash }),
    '<?xml version="1.0" encoding="UTF-8" ?>\n' +
      "<body>\n" +
      '<LoginUser version="1.1">\n' +
      "<userName>user-hash-abc123</userName>\n" +
      "<password>password-hash-def456</password>\n" +
      "<userVer>1</userVer>\n" +
      "</LoginUser>\n" +
      '<LoginNet version="1.1">\n' +
      "<type>LAN</type>\n" +
      "<udpPort>0</udpPort>\n" +
      "</LoginNet>\n" +
      "</body>\n",
  );
});

Deno.test("parseNonce reads the nonce from the encryption reply", () => {
  const xml = '<?xml version="1.0" encoding="UTF-8" ?>\n' +
    '<body>\n<Encryption version="1.1">\n<type>md5</type>\n' +
    "<nonce>0-AhnEZyUg6eKrJFIWgXOF</nonce>\n</Encryption>\n</body>\n";

  assertEquals(parseNonce(xml), "0-AhnEZyUg6eKrJFIWgXOF");
});

Deno.test("parseNonce throws when the reply has no nonce", () => {
  assertThrows(
    () => parseNonce("<body><Encryption></Encryption></body>"),
    Error,
    "nonce",
  );
});
