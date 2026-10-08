import { assertEquals } from "@std/assert";
import { decodeHex } from "@std/encoding/hex";
import { aesCfbDecrypt, aesCfbEncrypt, xorCipher } from "./cipher.ts";

Deno.test("xorCipher matches reolink_aio at offset 250", () => {
  assertEquals(
    xorCipher(new TextEncoder().encode("<?xml"), 250),
    decodeHex("fa8ed8feee"),
  );
});

Deno.test("xorCipher matches reolink_aio at offset 0", () => {
  assertEquals(
    xorCipher(new TextEncoder().encode("hello world"), 0),
    decodeHex("7748502735490f906d4158"),
  );
});

Deno.test("xorCipher matches reolink_aio at offset 251", () => {
  assertEquals(
    xorCipher(new TextEncoder().encode("abcdefghij"), 251),
    decodeHex("d1c3f1e76182b1afd9cb"),
  );
});

Deno.test("xorCipher decrypts what it encrypts", () => {
  const plain = new TextEncoder().encode("<body><nonce>abc</nonce></body>");

  assertEquals(xorCipher(xorCipher(plain, 250), 250), plain);
});

Deno.test("aesCfbEncrypt matches openssl aes-128-cfb for a partial block", () => {
  assertEquals(
    aesCfbEncrypt(
      new TextEncoder().encode("08822D7143979103"),
      new TextEncoder().encode("hello"),
    ),
    decodeHex("062c912dd6"),
  );
});

Deno.test("aesCfbDecrypt reads an openssl aes-128-cfb alarm event", () => {
  // deno-fmt-ignore
  const encrypted = decodeHex(
    "5276852cd5acf759b478e73ec559a4e7ff594bab8c8d4bbc7d02fd24e6fc8dfe" +
    "cc39ef3db24b1e4ea79ca78c0f05bc8e81799f50818d701efc15496dc823a189" +
    "9ec5c659c8d617d4732e9b866fc9466bb9cf4f1e5e1214fee738194e94c2a4f5" +
    "23e257be29093233d91264fdf8b31e54ec468c929e6399477624ca9538c67edb" +
    "6669241a7c788c0d850acab6a25482a729f7aa39c185374cb8fa780a5b2593c8" +
    "d976d5dc40867912d33df96bc0ee21a24c0974ea43b183d02ce3b3cdadc36278" +
    "d67f8117c8b5932a69bdab2ce23b2cfad4ab7834e59601f0b8d649def2f9f11e" +
    "22492116dc520513750b79c5eb0703740fa6e51e2f1ea664cd8bb627c740f341" +
    "32a00e86b0735ba6a32afb9c916485a4",
  );

  const plain = aesCfbDecrypt(
    new TextEncoder().encode("08822D7143979103"),
    encrypted,
  );

  assertEquals(
    new TextDecoder().decode(plain),
    '<?xml version="1.0" encoding="UTF-8" ?>\n' +
      "<body>\n" +
      '<AlarmEventList version="1.1">\n' +
      '<AlarmEvent version="1.1">\n' +
      "<channelId>0</channelId>\n" +
      "<status>MD,visitor</status>\n" +
      "<recording>0</recording>\n" +
      "<timeStamp>0</timeStamp>\n" +
      "<AItype>people</AItype>\n" +
      "</AlarmEvent>\n" +
      "</AlarmEventList>\n" +
      "</body>\n",
  );
});
