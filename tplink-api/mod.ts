/**
 * TP-Link Router API
 *
 * @module
 */

export { ACT, type Action, type ActionType } from "./payload.ts";
export { execute, type ExecuteOptions, type ExecuteResult, type ActionResult } from "./execute.ts";
export { authenticate, type AuthOptions, type AuthResult } from "./authenticate.ts";
