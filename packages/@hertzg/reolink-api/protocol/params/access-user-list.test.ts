import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { accessUserList } from "./access-user-list.ts";

Deno.test("accessUserList decodes the admin cmd 511 reply netserver writes", () => {
  const root = parse(
    '<accessUserList version="1.1"><maxAccessUserNum>10</maxAccessUserNum>' +
      "<availableAbility>15</availableAbility>" +
      "<User><userId>guest-a</userId><notes>Nanny</notes>" +
      "<phoneModel>Pixel 9</phoneModel><userLevel>0</userLevel>" +
      "<validHours>-1</validHours><loginState>1</loginState>" +
      "<ability>3</ability></User>" +
      "<User><userId>guest-b</userId><notes>Gardener</notes>" +
      "<phoneModel>iPhone 16</phoneModel><userLevel>1</userLevel>" +
      "<validHours>72</validHours><loginState>0</loginState>" +
      "<ability>1</ability></User></accessUserList>",
  ).root;

  assertEquals(accessUserList.decode(root), {
    maxAccessUserNum: 10,
    availableAbility: 15,
    User: [
      {
        userId: "guest-a",
        notes: "Nanny",
        phoneModel: "Pixel 9",
        userLevel: 0,
        validHours: -1,
        loginState: 1,
        ability: 3,
      },
      {
        userId: "guest-b",
        notes: "Gardener",
        phoneModel: "iPhone 16",
        userLevel: 1,
        validHours: 72,
        loginState: 0,
        ability: 1,
      },
    ],
  });
});

Deno.test("accessUserList decodes a reply with no users as an empty list", () => {
  const root = parse(
    '<accessUserList version="1.1"><maxAccessUserNum>10</maxAccessUserNum>' +
      "<availableAbility>3</availableAbility></accessUserList>",
  ).root;

  assertEquals(accessUserList.decode(root).User, []);
});

Deno.test("accessUserList round-trips a cmd 512 request", () => {
  const value = {
    User: [{
      userId: "guest-c",
      notes: "Courier",
      userLevel: 1,
      validHours: 6,
      ability: 2,
      userSetState: "modify" as const,
    }],
  };

  assertEquals(
    accessUserList.decode(parse(accessUserList.encode(value)).root),
    value,
  );
});

Deno.test("accessUserList rejects a user state the firmware does not map", () => {
  const root = parse(
    "<accessUserList><User><userSetState>add</userSetState></User></accessUserList>",
  ).root;

  assertThrows(() => accessUserList.decode(root), Error, '"add"');
});
