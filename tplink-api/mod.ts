/**
 * TP-Link Router API client library for Deno.
 *
 * This module provides authentication and command execution capabilities for
 * TP-Link routers (EU/GDPR versions) via direct API calls. Supports models
 * including TL-MR6400, Archer VR900v, TL-MR6500v, and Archer MR600 v2.
 *
 * The library handles the router's proprietary encryption protocol (AES + RSA)
 * and provides a type-safe interface for executing commands.
 *
 * @example Basic authentication and command execution
 * ```ts ignore
 * import { ACT, authenticate, execute } from "@hertzg/tplink-api";
 *
 * // Authenticate with the router
 * const auth = await authenticate("http://192.168.1.1", {
 *   password: "admin",
 * });
 *
 * if (auth) {
 *   // Execute a command to get LTE band info
 *   const result = await execute(
 *     "http://192.168.1.1",
 *     [[ACT.GET, "LTE_BANDINFO"]],
 *     auth,
 *   );
 *
 *   // result.actions contains the response data
 * }
 * ```
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
