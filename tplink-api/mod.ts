/**
 * TP-Link Router API
 *
 * @module
 */

export { ACT, type Action, type ActionType } from "./payload.ts";
export {
  type ActionResult,
  execute,
  type ExecuteOptions,
  type ExecuteResult,
} from "./execute.ts";
export {
  authenticate,
  type AuthOptions,
  type AuthResult,
} from "./authenticate.ts";
