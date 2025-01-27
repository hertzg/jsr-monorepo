import { afterEach, beforeEach, describe, it } from "@std/testing/bdd";
import {
  assertSpyCallAsync,
  assertSpyCalls,
  resolvesNext,
  type Stub,
  stub,
} from "@std/testing/mock";
import { DEFAULT_USER_AGENT, DEFAULTS, fetchToken } from "./oauth.ts";
import { assertEquals } from "@std/assert";

describe("oauth", () => {
  let fetchStub: Stub<
    typeof globalThis,
    Parameters<typeof globalThis.fetch>,
    ReturnType<typeof globalThis.fetch>
  >;

  const FAKE_TOKEN_INFO = {
    access_token: "fake_access_token",
    autoLogin: 1,
    expires_in: 3600,
    jti: "fake_jti",
    phoneNo: "fake_phoneNo",
    refresh_token: "fake_refresh_token",
    scope: "fake_scope",
    token_type: "fake_token_type",
    userId: 1234,
    userIdentifier: "fake_userIdentifier",
  };

  beforeEach(() => {
    fetchStub = stub(
      globalThis,
      "fetch",
      resolvesNext([
        {
          status: 200,
          json: resolvesNext([FAKE_TOKEN_INFO]),
        } as unknown as Response,
      ]),
    );
  });

  afterEach(() => {
    fetchStub.restore();
  });

  it("login success", async () => {
    const FAKE_USERNAME = "test";
    const FAKE_PASSWORD = "test";

    const result = await fetchToken(
      {
        type: "login",
        username: FAKE_USERNAME,
        password: FAKE_PASSWORD,
      },
      {
        fetch: fetchStub,
      },
    );

    assertSpyCalls(fetchStub, 1);

    const expectedPayload = new URLSearchParams();
    expectedPayload.append("client_id", DEFAULTS.login.clientId);
    expectedPayload.append("grant_type", DEFAULTS.login.grantType);
    expectedPayload.append("username", FAKE_USERNAME);
    expectedPayload.append("password", FAKE_PASSWORD);

    assertSpyCallAsync(fetchStub, 0, {
      args: [
        "https://oauth.magticom.ge/auth/oauth/token",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: DEFAULTS.login.authorization,
            "User-Agent": DEFAULT_USER_AGENT,
          },
          body: expectedPayload.toString(),
        },
      ],
    });

    assertEquals(result.result, "success");
    assertEquals(result.statusCode, 200);
    assertEquals(result.data, FAKE_TOKEN_INFO);
  });
});
