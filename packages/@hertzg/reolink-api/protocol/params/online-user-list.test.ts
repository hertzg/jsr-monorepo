import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { onlineUserList } from "./online-user-list.ts";

Deno.test("onlineUserList decodes a cmd 120 reply with two sessions", () => {
  const root = parse(
    '<OnlineUserList version="1.1">' +
      "<OnlineUser><userId>0</userId><sessionId>17</sessionId>" +
      "<userName>admin</userName><userLevel>1</userLevel>" +
      "<ipAddress>192.168.1.20</ipAddress><macAddress></macAddress>" +
      "<enableOutoffLine>0</enableOutoffLine><isOnline>1</isOnline></OnlineUser>" +
      "<OnlineUser><userId>2</userId><sessionId>23</sessionId>" +
      "<userName>guest</userName><userLevel>0</userLevel>" +
      "<ipAddress>192.168.1.31</ipAddress><macAddress></macAddress>" +
      "<enableOutoffLine>1</enableOutoffLine><isOnline>1</isOnline></OnlineUser>" +
      "</OnlineUserList>",
  ).root;

  assertEquals(onlineUserList.decode(root), {
    OnlineUser: [
      {
        userId: 0,
        sessionId: 17,
        userName: "admin",
        userLevel: 1,
        ipAddress: "192.168.1.20",
        macAddress: "",
        enableOutoffLine: 0,
        isOnline: 1,
      },
      {
        userId: 2,
        sessionId: 23,
        userName: "guest",
        userLevel: 0,
        ipAddress: "192.168.1.31",
        macAddress: "",
        enableOutoffLine: 1,
        isOnline: 1,
      },
    ],
  });
});

Deno.test("onlineUserList decodes an empty list", () => {
  const root = parse('<OnlineUserList version="1.1"></OnlineUserList>').root;

  assertEquals(onlineUserList.decode(root), { OnlineUser: [] });
});

Deno.test("onlineUserList rejects a user without a session", () => {
  const root = parse(
    '<OnlineUserList version="1.1"><OnlineUser><userName>admin</userName>' +
      "</OnlineUser></OnlineUserList>",
  ).root;

  assertThrows(() => onlineUserList.decode(root), Error, "<sessionId>");
});

Deno.test("onlineUserList round-trips through encode and decode", () => {
  const value = {
    OnlineUser: [{
      userId: 1,
      sessionId: 42,
      userName: "operator",
      password: "operator-pass",
      userLevel: 0,
      ipAddress: "10.0.0.5",
      macAddress: "",
      enableOutoffLine: 1,
      isOnline: 1,
    }],
  };

  const xml = onlineUserList.encode(value);

  assertEquals(onlineUserList.decode(parse(xml).root), value);
});
