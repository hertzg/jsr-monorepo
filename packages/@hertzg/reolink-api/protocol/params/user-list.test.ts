import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { type UserList, userList } from "./user-list.ts";

Deno.test("userList decodes the cmd 58 reply element with two accounts", () => {
  const root = parse(
    '<UserList version="1.1"><User><userId>0</userId>' +
      "<userName>admin</userName><userLevel>1</userLevel>" +
      "<loginState>1</loginState><userSetState>none</userSetState></User>" +
      "<User><userId>1</userId><userName>viewer</userName>" +
      "<userLevel>0</userLevel><loginState>0</loginState>" +
      "<userSetState>none</userSetState></User></UserList>",
  ).root;

  assertEquals(userList.decode(root), {
    User: [
      {
        userId: 0,
        userName: "admin",
        userLevel: 1,
        loginState: 1,
        userSetState: "none",
      },
      {
        userId: 1,
        userName: "viewer",
        userLevel: 0,
        loginState: 0,
        userSetState: "none",
      },
    ],
  });
});

Deno.test("userList round-trips a modify request with a password", () => {
  const value: UserList = {
    User: [{
      userId: 2,
      userName: "operator",
      userLevel: 0,
      userSetState: "modify",
      password: "new-password",
    }],
  };

  assertEquals(userList.decode(parse(userList.encode(value)).root), value);
});

Deno.test("userList rejects an unknown userSetState", () => {
  const root = parse(
    '<UserList version="1.1"><User><userName>x</userName>' +
      "<userSetState>rename</userSetState></User></UserList>",
  ).root;

  assertThrows(() => userList.decode(root), Error, '"rename"');
});
