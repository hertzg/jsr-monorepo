/**
 * Baichuan "modern" login: nonce, hashed credentials and the session key.
 *
 * The login takes two round trips, both XOR-encrypted:
 *
 * ```
 * cmd 1, class 0x1465, no body   ->  <Encryption><nonce>...</nonce></Encryption>
 * cmd 1, class 0x1464, loginXml  ->  status 200, or 401 on bad credentials
 * ```
 *
 * Everything after that is AES-encrypted with the key from
 * {@link loginCredentials}.
 *
 * @example Build the login body from a nonce
 * ```ts
 * import { assertEquals, assertStringIncludes } from "@std/assert";
 * import {
 *   loginCredentials,
 *   loginXml,
 *   parseNonce,
 * } from "@hertzg/reolink-client/protocol/login";
 *
 * const nonce = parseNonce(
 *   "<body><Encryption><nonce>NONCE-0123</nonce></Encryption></body>",
 * );
 * const credentials = loginCredentials({
 *   username: "admin",
 *   password: "hunter2",
 *   nonce,
 * });
 *
 * assertEquals(nonce, "NONCE-0123");
 * assertStringIncludes(
 *   loginXml(credentials),
 *   "<userName>329F51D2942C5953794C5C99EB43D46</userName>",
 * );
 * ```
 *
 * @module
 */

import { md5 } from "@noble/hashes/legacy.js";
import { isElement, isText, parse, type XmlElement } from "@std/xml";

/**
 * Hashes a string the way Baichuan's modern login does: MD5 of the UTF-8
 * bytes, as upper-case hex, with the last hex digit dropped (31 characters).
 *
 * @param text The string to hash.
 * @returns The 31-character upper-case hex digest.
 *
 * @example Hash a string
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { md5Modern } from "@hertzg/reolink-client/protocol/login";
 *
 * assertEquals(md5Modern(""), "D41D8CD98F00B204E9800998ECF8427");
 * ```
 */
export function md5Modern(text: string): string {
  const digest = md5(new TextEncoder().encode(text));
  const hex = Array.from(digest, (byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return hex.slice(0, 31).toUpperCase();
}

/** What the login needs: the user's credentials and the camera's nonce. */
export type LoginCredentialsOptions = {
  /** The camera user name. */
  username: string;
  /** The camera password. */
  password: string;
  /** The nonce from the camera's encryption reply, see {@link parseNonce}. */
  nonce: string;
};

/** The hashed credentials sent at login, and the session key that follows. */
export type LoginCredentials = {
  /** `md5Modern(username + nonce)`. */
  userHash: string;
  /** `md5Modern(password + nonce)`. */
  passwordHash: string;
  /** The first 16 characters of `md5Modern(nonce + "-" + password)`, as UTF-8 bytes. */
  aesKey: Uint8Array;
};

/**
 * Derives the hashed credentials and the AES session key from a nonce.
 *
 * @param options The user name, password and nonce.
 * @returns The hashes for {@link loginXml} and the AES key for the session.
 *
 * @example Derive the session key
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { loginCredentials } from "@hertzg/reolink-client/protocol/login";
 *
 * const { aesKey } = loginCredentials({
 *   username: "admin",
 *   password: "hunter2",
 *   nonce: "NONCE-0123",
 * });
 *
 * assertEquals(new TextDecoder().decode(aesKey), "08822D7143979103");
 * ```
 */
export function loginCredentials(
  options: LoginCredentialsOptions,
): LoginCredentials {
  const { username, password, nonce } = options;
  return {
    userHash: md5Modern(username + nonce),
    passwordHash: md5Modern(password + nonce),
    aesKey: new TextEncoder().encode(
      md5Modern(`${nonce}-${password}`).slice(0, 16),
    ),
  };
}

/**
 * Builds the XML body of the login request.
 *
 * @param credentials The hashes from {@link loginCredentials}.
 * @returns The login XML, ready to be XOR-encrypted.
 *
 * @example Build the login body
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { loginXml } from "@hertzg/reolink-client/protocol/login";
 *
 * const xml = loginXml({ userHash: "USER", passwordHash: "PASS" });
 *
 * assertStringIncludes(xml, "<userName>USER</userName>");
 * assertStringIncludes(xml, "<password>PASS</password>");
 * ```
 */
export function loginXml(
  credentials: Pick<LoginCredentials, "userHash" | "passwordHash">,
): string {
  return '<?xml version="1.0" encoding="UTF-8" ?>\n' +
    "<body>\n" +
    '<LoginUser version="1.1">\n' +
    `<userName>${credentials.userHash}</userName>\n` +
    `<password>${credentials.passwordHash}</password>\n` +
    "<userVer>1</userVer>\n" +
    "</LoginUser>\n" +
    '<LoginNet version="1.1">\n' +
    "<type>LAN</type>\n" +
    "<udpPort>0</udpPort>\n" +
    "</LoginNet>\n" +
    "</body>\n";
}

/**
 * Reads the nonce from the camera's reply to the nonce request.
 *
 * @param xml The decrypted reply body.
 * @returns The text of the first `<nonce>` element.
 * @throws {Error} When the reply has no `<nonce>` element.
 *
 * @example Read the nonce
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseNonce } from "@hertzg/reolink-client/protocol/login";
 *
 * const xml = "<body><Encryption><nonce>abc</nonce></Encryption></body>";
 *
 * assertEquals(parseNonce(xml), "abc");
 * ```
 */
export function parseNonce(xml: string): string {
  const nonce = findElement(parse(xml).root, "nonce");
  if (nonce === undefined) {
    throw new Error("Baichuan nonce reply has no <nonce> element");
  }
  return nonce.children.filter(isText).map((node) => node.text).join("");
}

function findElement(
  element: XmlElement,
  name: string,
): XmlElement | undefined {
  if (element.name.local === name) {
    return element;
  }
  for (const child of element.children.filter(isElement)) {
    const found = findElement(child, name);
    if (found !== undefined) {
      return found;
    }
  }
  return undefined;
}
