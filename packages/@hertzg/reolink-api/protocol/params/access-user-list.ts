/**
 * `<accessUserList>`: the phones the owner has shared Video Doorbell PoE
 * access with. Read with cmd 511 (`GET_SHARED_USER_CFG`) and changed with
 * cmd 512 (`SET_SHARED_USER_CFG`).
 *
 * Firmware: `net_shared_user_cfg_x2s` hands every `<User>` child (matched
 * ignoring case) to `get_shared_user_from_xmlnode`, which reads whichever
 * field is present into one shared slot, so a request in effect carries a
 * single user. It rejects an empty `userId` or `notes`, an `ability` of 0,
 * a `validHours` of 0 or below -1, a `userLevel` other than 0 or 1, and a
 * `userSetState` other than `delete` or `modify`.
 *
 * The cmd 511 reply, built in netserver, writes `maxAccessUserNum` (always
 * 10) and `availableAbility`, then one `<User>` per shared user. An admin
 * session sees every user with `notes` and `phoneModel`; any other session
 * sees only its own entry, without those two fields.
 *
 * @example Read a cmd 511 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { accessUserList } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<accessUserList version="1.1"><maxAccessUserNum>10</maxAccessUserNum>' +
 *     "<availableAbility>7</availableAbility><User><userId>guest-1</userId>" +
 *     "<userLevel>0</userLevel><validHours>24</validHours>" +
 *     "<loginState>1</loginState><ability>3</ability></User></accessUserList>",
 * ).root;
 *
 * assertEquals(accessUserList.decode(root).User[0].userId, "guest-1");
 * ```
 *
 * @module
 */

import {
  int,
  obj,
  oneOf,
  optional,
  repeated,
  text,
  uint,
  type XmlParam,
  xmlParam,
} from "../xml.ts";

/** One shared user, a `<User>` in `<accessUserList>`. */
export type AccessUser = {
  /** The shared user's id, up to 32 bytes; must not be empty. */
  userId?: string;
  /** A note about the user, up to 32 bytes; admin replies only. */
  notes?: string;
  /** Reply only: the phone model; admin replies only. */
  phoneModel?: string;
  /** 0 or 1. */
  userLevel?: number;
  /** How many hours access lasts; -1 or a positive number. */
  validHours?: number;
  /** Reply only: the user's login state. */
  loginState?: number;
  /** The granted ability bitmask; must not be 0. Replies write 0 when abilities are off. */
  ability?: number;
  /** Request only: what to do with the user. */
  userSetState?: "delete" | "modify";
};

/** The shared users in `<accessUserList>`. */
export type AccessUserList = {
  /** Reply only: the most users that can be shared, always 10. */
  maxAccessUserNum?: number;
  /** Reply only: the ability bitmask the device offers, built from its capabilities. */
  availableAbility?: number;
  /** The shared users; missing reads as `[]`. */
  User: AccessUser[];
};

/**
 * Codec for `<accessUserList>`.
 *
 * @example Build a cmd 512 request that removes a user
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { accessUserList } from "@hertzg/reolink-api/protocol/params";
 *
 * assertEquals(
 *   accessUserList.encode({
 *     User: [{ userId: "guest-1", userSetState: "delete" }],
 *   }),
 *   '<accessUserList version="1.1"><User><userId>guest-1</userId>' +
 *     "<userSetState>delete</userSetState></User></accessUserList>",
 * );
 * ```
 */
export const accessUserList: XmlParam<"accessUserList", AccessUserList> =
  xmlParam("accessUserList", {
    maxAccessUserNum: optional(int()),
    availableAbility: optional(int()),
    User: repeated(obj({
      userId: optional(text()),
      notes: optional(text()),
      phoneModel: optional(text()),
      userLevel: optional(int()),
      validHours: optional(int()),
      loginState: optional(int()),
      ability: optional(uint()),
      userSetState: optional(oneOf("delete", "modify")),
    })),
  });
