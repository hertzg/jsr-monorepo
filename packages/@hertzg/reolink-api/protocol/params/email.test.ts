import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { email } from "./email.ts";

Deno.test("email decodes every field nets_email_cfg_s2x writes", () => {
  const root = parse(
    '<Email version="1.1"><smtpServer>smtp.example.com</smtpServer>' +
      "<userName>sender@example.com</userName><senderMaxLen>127</senderMaxLen>" +
      "<password>smtp-secret</password><pwdMaxLen>127</pwdMaxLen>" +
      "<address1>one@example.com</address1><address2>two@example.com</address2>" +
      "<address3>three@example.com</address3><sendNickname>Camera</sendNickname>" +
      "<smtpPort>465</smtpPort><attachment>1</attachment>" +
      "<attachmentType>picture</attachmentType><textType>withText</textType>" +
      "<ssl>1</ssl><interval>30</interval></Email>",
  ).root;

  assertEquals(email.decode(root), {
    smtpServer: "smtp.example.com",
    userName: "sender@example.com",
    senderMaxLen: 127,
    password: "smtp-secret",
    pwdMaxLen: 127,
    address1: "one@example.com",
    address2: "two@example.com",
    address3: "three@example.com",
    sendNickname: "Camera",
    smtpPort: 465,
    attachment: 1,
    attachmentType: "picture",
    textType: "withText",
    ssl: 1,
    interval: 30,
  });
});

Deno.test("email decodes a video attachment, which the camera writes without attachment", () => {
  const root = parse(
    '<Email version="1.1"><attachmentType>video</attachmentType></Email>',
  ).root;

  assertEquals(email.decode(root), { attachmentType: "video" });
});

Deno.test("email round-trips a request with the parser-only emailAttachType", () => {
  const value = {
    smtpServer: "mail.example.net",
    smtpPort: 587,
    textType: "mustBeText",
    emailAttachType: 2,
  } as const;

  assertEquals(email.decode(parse(email.encode(value)).root), value);
});

Deno.test("email rejects an unknown text type", () => {
  const root = parse(
    '<Email version="1.1"><textType>html</textType></Email>',
  ).root;

  assertThrows(() => email.decode(root), Error, '"html"');
});
