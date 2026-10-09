import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { authInfo } from "./auth-info.ts";

Deno.test("authInfo decodes the cmd 509 reply the firmware writes", () => {
  const root = parse('<authInfo version="1.1"><code>135790</code></authInfo>')
    .root;

  assertEquals(authInfo.decode(root), { code: 135790 });
});

Deno.test("authInfo decodes a cmd 509 request", () => {
  const root = parse(
    "<authInfo><notes>Dog walker</notes><validhours>48</validhours>" +
      "<userLevel>1</userLevel><ability>5</ability>" +
      "<channelAbility>18446744073709551615</channelAbility></authInfo>",
  ).root;

  assertEquals(authInfo.decode(root), {
    notes: "Dog walker",
    validhours: 48,
    userLevel: 1,
    ability: 5,
    channelAbility: 18446744073709551615n,
  });
});

Deno.test("authInfo round-trips through encode and decode", () => {
  const value = {
    notes: "Cleaner",
    validhours: 12,
    userLevel: 0,
    ability: 7,
    channelAbility: 2n,
    code: 246802,
  };

  assertEquals(authInfo.decode(parse(authInfo.encode(value)).root), value);
});
