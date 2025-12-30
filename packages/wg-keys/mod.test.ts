import {
  assertExists,
  assertNotStrictEquals,
  assertStrictEquals,
} from "@std/assert";
import {
  publicBytesFromPrivateBytes,
  randomPrivateKeyBytes,
  wgGenKey,
  wgPubKey,
} from "./mod.ts";
import { Buffer } from "node:buffer";
import { spawn } from "node:child_process";
import { test } from "node:test";

test("private key is clamped", () => {
  const key = wgGenKey();
  assertStrictEquals(key.length, 44);

  const bytes = Buffer.from(key, "base64");
  assertStrictEquals(bytes.length, 32);

  assertStrictEquals(bytes[0] & 0b00000111, 0);
  assertStrictEquals(bytes[31] & 0b10000000, 0);
  assertStrictEquals(bytes[31] & 0b01000000, 0b01000000);
});

test("public key values are interchangable", async () => {
  const privKeyBytes = randomPrivateKeyBytes();
  const privKeyBase64 = Buffer.from(privKeyBytes).toString("base64");

  assertStrictEquals(
    await wgPubKey(privKeyBase64),
    Buffer.from(await publicBytesFromPrivateBytes(privKeyBytes)).toString(
      "base64",
    ),
  );
});

async function isGivenEnoughPermissions() {
  try {
    const [runPerm, envPerm, readPerm] = await Promise.all([
      Deno.permissions.query({ name: "run" }),
      Deno.permissions.query({ name: "env" }),
      Deno.permissions.query({ name: "read" }),
    ]);

    return (
      readPerm.state === "granted" &&
      envPerm.state === "granted" &&
      runPerm.state === "granted"
    );
  } catch (_) {
    return false;
  }
}

test(
  "integration: public key matches output of wg pubkey",
  { skip: !(await isGivenEnoughPermissions()) },
  async function assert_matches_wg_tool() {
    const privKey = wgGenKey();
    assertExists(privKey);

    const pubKey = await wgPubKey(privKey);
    assertNotStrictEquals(pubKey, privKey);

    const proc = spawn("wg", ["pubkey"], {
      stdio: ["pipe", "pipe", "inherit"],
      shell: true,
    });
    proc.stdin.end(privKey);

    const execResult: string = await new Promise((resolve) => {
      const chunks: string[] = [];
      proc.stdout.on("data", (chunk) => {
        chunks.push(chunk);
      });

      proc.stdout.on("end", () => {
        resolve(chunks.join());
      });
    });

    assertStrictEquals(pubKey, execResult.trim());
  },
);
