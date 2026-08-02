/**
 * Tests for the main module exports.
 *
 * The type-level test below is the point of this file as much as the runtime
 * ones: `mod.ts` is the package's whole public surface, so a function it
 * exports whose signature names a type it does not is unusable from outside —
 * there is no way to declare a variable to pass in, or to hold the result.
 */

import { assertEquals } from "@std/assert";
import {
  type DenoDocDeclaration,
  type DenoDocJson,
  type DenoDocNode,
  type DenoDocParam,
  type DenoDocSymbol,
  type DenoDocType,
  type DiscoverySuccess,
  type EmptyDiscoveryDiagnosis,
  main,
  readDocSurface,
  type SymbolDocsOutcome,
} from "./mod.ts";

Deno.test("main function is exported", () => {
  assertEquals(typeof main, "function");
});

Deno.test("main function is async", () => {
  const result = main(["-h"]); // Use help flag to avoid exit
  assertEquals(result instanceof Promise, true);
});

Deno.test("the types in the exported signatures are exported too", () => {
  const param: DenoDocParam = { kind: "identifier" };
  const returnType: DenoDocType = {
    repr: "Coder",
    value: { typeParams: [{ repr: "Thing" }] },
  };
  const declaration: DenoDocDeclaration = {
    kind: "function",
    location: { filename: "https://jsr.io/@scope/thing/1.0.0/mod.ts" },
    def: { params: [param], returnType },
  };
  const symbol: DenoDocSymbol = { name: "thing", declarations: [declaration] };
  const node: DenoDocNode = { symbols: [symbol] };
  const doc: DenoDocJson = { nodes: { "jsr:@scope/thing": node } };

  const success: DiscoverySuccess = {
    ok: true,
    specifier: "jsr:@scope/thing",
    ...readDocSurface(doc),
  };
  const docs: SymbolDocsOutcome = { ok: true, text: "thing" };
  const diagnosis: EmptyDiscoveryDiagnosis = {
    ok: true,
    specifier: "jsr:@scope/thing",
    dependsOnBinstruct: true,
  };

  assertEquals(success.coders.map((coder) => coder.name), ["thing"]);
  assertEquals(success.coders[0].requiredParams, 1);
  assertEquals(success.version, "1.0.0");
  assertEquals(docs.ok, true);
  assertEquals(diagnosis.ok, true);
});
