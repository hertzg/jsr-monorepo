/**
 * `<Email>`: SMTP settings for alarm emails. The camera replies with it to
 * cmd 42 (`GET_EMAILCFG_V20`) and reads it from cmd 43
 * (`SET_EMAILCFG_V20`) and cmd 141 (`EMAIL_TEST_V20`).
 *
 * Firmware: `nets_email_cfg_s2x` writes every field except three:
 * `attachment` only for attachment types `none` and `picture`,
 * `attachmentType` only for a known type, and `textType` only for
 * `withText` or `withoutText`. The parser `nets_param_email_cfg_x2s` reads
 * whichever fields are present, so none is required. It also reads
 * `emailAttachType`, which the camera never writes, and never reads
 * `senderMaxLen` or `pwdMaxLen`.
 *
 * @example Read a cmd 42 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { email } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<Email version="1.1"><smtpServer>smtp.example.com</smtpServer>' +
 *     "<userName>sender@example.com</userName><smtpPort>465</smtpPort>" +
 *     "<attachment>1</attachment><attachmentType>picture</attachmentType>" +
 *     "<ssl>1</ssl></Email>",
 * ).root;
 *
 * assertEquals(email.decode(root).attachmentType, "picture");
 * ```
 *
 * @module
 */

import { int, oneOf, optional, text, type XmlParam, xmlParam } from "../xml.ts";

/** The SMTP settings in `<Email>`. */
export type Email = {
  /** SMTP server host name or address, up to 255 bytes. */
  smtpServer?: string;
  /** SMTP account name. */
  userName?: string;
  /** Longest sender the camera accepts; always 127, reply only. */
  senderMaxLen?: number;
  /** SMTP account password. */
  password?: string;
  /** Longest password the camera accepts; always 127, reply only. */
  pwdMaxLen?: number;
  /** First recipient, up to 255 bytes. */
  address1?: string;
  /** Second recipient, up to 255 bytes. */
  address2?: string;
  /** Third recipient, up to 255 bytes. */
  address3?: string;
  /** Sender display name. */
  sendNickname?: string;
  /** SMTP server port, 1 to 65535. */
  smtpPort?: number;
  /** 1 to attach a picture, 0 for none; not written for `video`. */
  attachment?: number;
  /** What to attach. */
  attachmentType?: "none" | "picture" | "video";
  /** Body text mode; the camera writes only `withText` or `withoutText`. */
  textType?: "mustBeText" | "withText" | "withoutText";
  /** 1 to use SSL, 0 for plain SMTP. */
  ssl?: number;
  /** Minimum time between alarm emails, in the camera's units. */
  interval?: number;
  /** Attachment type as a number; read by the parser, never written. */
  emailAttachType?: number;
};

/**
 * Codec for `<Email>`.
 *
 * @example Build an `<Email>` element for cmd 43
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { email } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = email.encode({
 *   smtpServer: "smtp.example.com",
 *   smtpPort: 587,
 *   address1: "alerts@example.com",
 *   textType: "withText",
 * });
 *
 * assertStringIncludes(xml, "<textType>withText</textType>");
 * ```
 */
export const email: XmlParam<"Email", Email> = xmlParam("Email", {
  smtpServer: optional(text()),
  userName: optional(text()),
  senderMaxLen: optional(int()),
  password: optional(text()),
  pwdMaxLen: optional(int()),
  address1: optional(text()),
  address2: optional(text()),
  address3: optional(text()),
  sendNickname: optional(text()),
  smtpPort: optional(int()),
  attachment: optional(int()),
  attachmentType: optional(oneOf("none", "picture", "video")),
  textType: optional(oneOf("mustBeText", "withText", "withoutText")),
  ssl: optional(int()),
  interval: optional(int()),
  emailAttachType: optional(int()),
});
