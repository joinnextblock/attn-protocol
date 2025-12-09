/**
 * Hooks exports for @attn-protocol/marketplace
 */

export { HookEmitter } from './emitter.ts';
export {
  validate_required_hooks,
  get_missing_required_hooks,
  MissingHooksError,
} from './validation.ts';
export {
  REQUIRED_HOOKS,
  OPTIONAL_HOOKS,
} from './types.ts';
export type {
  RequiredHook,
  OptionalHook,
  HookName,
  HookHandler,
  HookHandlers,
  HookHandle,
} from './types.ts';
