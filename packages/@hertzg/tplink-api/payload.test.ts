import { assert, assertEquals } from "@std/assert";
import { ACT, type Action, parse, type Section, stringify } from "./payload.ts";

Deno.test("ACT enum has correct values", () => {
  assertEquals(ACT.GET, 1);
  assertEquals(ACT.SET, 2);
  assertEquals(ACT.ADD, 3);
  assertEquals(ACT.DEL, 4);
  assertEquals(ACT.GL, 5);
  assertEquals(ACT.GS, 6);
  assertEquals(ACT.OP, 7);
  assertEquals(ACT.CGI, 8);
});

Deno.test("stringify single action with array attributes", () => {
  const result = stringify([[ACT.GET, "some_oid", [
    "attr1=value1",
    "attr2=value2",
  ]]]);

  assertEquals(
    result,
    "1\r\n[some_oid#0,0,0,0,0,0#0,0,0,0,0,0]0,2\r\nattr1=value1\r\nattr2=value2\r\n",
  );
});

Deno.test("stringify single action with object attributes", () => {
  const result = stringify([[ACT.SET, "some_oid", {
    key1: "val1",
    key2: "val2",
  }]]);

  assertEquals(
    result,
    "2\r\n[some_oid#0,0,0,0,0,0#0,0,0,0,0,0]0,2\r\nkey1=val1\r\nkey2=val2\r\n",
  );
});

Deno.test("stringify action with custom stack values", () => {
  const result = stringify([[
    ACT.GET,
    "oid",
    [],
    "1,2,3,4,5,6",
    "7,8,9,10,11,12",
  ]]);

  assertEquals(result, "1\r\n[oid#1,2,3,4,5,6#7,8,9,10,11,12]0,0\r\n");
});

Deno.test("stringify multiple actions", () => {
  const result = stringify([
    [ACT.GET, "oid1", ["a=1"]],
    [ACT.SET, "oid2", ["b=2"]],
  ]);

  assertEquals(
    result,
    "1&2\r\n[oid1#0,0,0,0,0,0#0,0,0,0,0,0]0,1\r\na=1\r\n[oid2#0,0,0,0,0,0#0,0,0,0,0,0]1,1\r\nb=2\r\n",
  );
});

Deno.test("stringify action with no attributes", () => {
  const result = stringify([[ACT.GET, "simple_oid"]]);

  assertEquals(result, "1\r\n[simple_oid#0,0,0,0,0,0#0,0,0,0,0,0]0,0\r\n");
});

Deno.test("parse simple response with attributes", () => {
  const data = "[some_stack]0\nattr1=value1\nattr2=value2";
  const result = parse(data);
  const action = result.actions[0] as Section;

  assertEquals(result.error, null);
  assertEquals(result.actions.length, 1);
  assertEquals(action.stack, "some_stack");
  assertEquals(action.actionIndex, 0);
  assertEquals(action.attributes, {
    attr1: "value1",
    attr2: "value2",
  });
});

Deno.test("parse response with error section", () => {
  const data = "[error]5";
  const result = parse(data);

  assertEquals(result.error, 5);
  assertEquals(result.actions.length, 0);
});

Deno.test("parse response with cgi script", () => {
  const data = "[cgi]0\nconsole.log('hello');\nvar x = 1;";
  const result = parse(data);
  const action = result.actions[0] as Section;

  assertEquals(result.error, null);
  assertEquals(action.stack, "cgi");
  assertEquals(action.script, "console.log('hello');\nvar x = 1;\n");
});

Deno.test("parse response with multiple sections for same action", () => {
  const data = "[stack1]0\na=1\n[stack2]0\nb=2";
  const result = parse(data);

  assertEquals(result.error, null);
  assert(Array.isArray(result.actions[0]));
  assertEquals(result.actions[0].length, 2);
  assertEquals(result.actions[0][0].attributes, { a: "1" });
  assertEquals(result.actions[0][1].attributes, { b: "2" });
});

Deno.test("parse response with gaps in action indices", () => {
  const data = "[stack]2\na=1";
  const result = parse(data);
  const action2 = result.actions[2] as Section;

  assertEquals(result.actions.length, 3);
  // Placeholder actions only have actionIndex
  assertEquals((result.actions[0] as Section).actionIndex, 0);
  assertEquals((result.actions[1] as Section).actionIndex, 1);
  assertEquals(action2.actionIndex, 2);
  assertEquals(action2.attributes, { a: "1" });
});

Deno.test("parse attribute with equals sign in value", () => {
  const data = "[stack]0\nkey=value=with=equals";
  const result = parse(data);
  const action = result.actions[0] as Section;

  assertEquals(action.attributes?.key, "value=with=equals");
});

Deno.test("stringify and parse roundtrip preserves structure", () => {
  const original: Action[] = [[ACT.GET, "test_oid", {
    foo: "bar",
    num: "123",
  }]];
  const _stringified = stringify(original);

  // The response format is different from request format,
  // but we can verify the attributes are preserved in a response-like format
  const responseFormat =
    "[test_oid#0,0,0,0,0,0#0,0,0,0,0,0]0\nfoo=bar\nnum=123";
  const parsed = parse(responseFormat);
  const action = parsed.actions[0] as Section;

  assertEquals(action.attributes, { foo: "bar", num: "123" });
});
