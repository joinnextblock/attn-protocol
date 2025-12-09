/**
 * Hook names and handler types for the ATTN Marketplace.
 *
 * Defines the required and optional hooks that consumers must/can implement.
 *
 * @module
 */

import type {
  StoreBillboardContext,
  StorePromotionContext,
  StoreAttentionContext,
  StoreMatchContext,
  StoreMarketplaceContext,
  StoreBillboardConfirmationContext,
  StoreAttentionConfirmationContext,
  StoreMarketplaceConfirmationContext,
  StoreAttentionPaymentConfirmationContext,
  QueryPromotionsContext,
  QueryPromotionsResult,
  QueryAttentionContext,
  QueryAttentionResult,
  ExistsContext,
  ExistsResult,
  FindMatchesContext,
  FindMatchesResult,
  BeforeCreateMatchContext,
  BeforeCreateMatchResult,
  AfterCreateMatchContext,
  BeforePublishMatchContext,
  BeforePublishMatchResult,
  AfterPublishMatchContext,
  BeforePublishMarketplaceContext,
  BeforePublishMarketplaceResult,
  AfterPublishMarketplaceContext,
  OnBillboardConfirmationContext,
  OnAttentionConfirmationContext,
  BeforePublishMarketplaceConfirmationContext,
  BeforePublishMarketplaceConfirmationResult,
  AfterPublishMarketplaceConfirmationContext,
  OnAttentionPaymentConfirmationContext,
  AggregatesContext,
  AggregatesResult,
  BlockBoundaryContext,
  ValidatePromotionContext,
  ValidateAttentionContext,
  ValidationResult,
} from '../types/hooks.js';

/**
 * Required hooks that consumers MUST implement.
 *
 * These hooks provide the storage and matching logic for the marketplace.
 * The marketplace will throw `MissingHooksError` if any are not registered.
 *
 * @example
 * ```ts
 * // All of these must be implemented:
 * marketplace.on_store_promotion(async (ctx) => { ... });
 * marketplace.on_store_attention(async (ctx) => { ... });
 * marketplace.on_store_billboard(async (ctx) => { ... });
 * marketplace.on_store_match(async (ctx) => { ... });
 * marketplace.on_query_promotions(async (ctx) => { ... });
 * marketplace.on_find_matches(async (ctx) => { ... });
 * marketplace.on_exists(async (ctx) => { ... });
 * marketplace.on_get_aggregates(async (ctx) => { ... });
 * ```
 */
export const REQUIRED_HOOKS = [
  'store_promotion',
  'store_attention',
  'store_billboard',
  'store_match',
  'query_promotions',
  'find_matches',
  'exists',
  'get_aggregates',
] as const;

/**
 * Optional hooks that consumers MAY implement.
 *
 * These hooks allow customization of the marketplace lifecycle.
 */
export const OPTIONAL_HOOKS = [
  // Storage (optional)
  'store_marketplace',
  'store_billboard_confirmation',
  'store_attention_confirmation',
  'store_marketplace_confirmation',
  'store_attention_payment_confirmation',
  // Query (optional)
  'query_attention',
  // Matching lifecycle
  'before_create_match',
  'after_create_match',
  'before_publish_match',
  'after_publish_match',
  // Marketplace publishing lifecycle
  'before_publish_marketplace',
  'after_publish_marketplace',
  // Confirmation lifecycle
  'on_billboard_confirmation',
  'on_attention_confirmation',
  'before_publish_marketplace_confirmation',
  'after_publish_marketplace_confirmation',
  'on_attention_payment_confirmation',
  // Block boundary
  'block_boundary',
  // Validation
  'validate_promotion',
  'validate_attention',
] as const;

/** Type for required hook names */
export type RequiredHook = typeof REQUIRED_HOOKS[number];

/** Type for optional hook names */
export type OptionalHook = typeof OPTIONAL_HOOKS[number];

/** Type for all hook names (required and optional) */
export type HookName = RequiredHook | OptionalHook;

/**
 * Type mapping from hook names to their handler signatures.
 *
 * Used internally for type-safe hook registration.
 */
export interface HookHandlers {
  // Required hooks
  store_promotion: (ctx: StorePromotionContext) => Promise<void>;
  store_attention: (ctx: StoreAttentionContext) => Promise<void>;
  store_billboard: (ctx: StoreBillboardContext) => Promise<void>;
  store_match: (ctx: StoreMatchContext) => Promise<void>;
  query_promotions: (ctx: QueryPromotionsContext) => Promise<QueryPromotionsResult>;
  find_matches: (ctx: FindMatchesContext) => Promise<FindMatchesResult>;
  exists: (ctx: ExistsContext) => Promise<ExistsResult>;
  get_aggregates: (ctx: AggregatesContext) => Promise<AggregatesResult>;

  // Optional storage hooks
  store_marketplace: (ctx: StoreMarketplaceContext) => Promise<void>;
  store_billboard_confirmation: (ctx: StoreBillboardConfirmationContext) => Promise<void>;
  store_attention_confirmation: (ctx: StoreAttentionConfirmationContext) => Promise<void>;
  store_marketplace_confirmation: (ctx: StoreMarketplaceConfirmationContext) => Promise<void>;
  store_attention_payment_confirmation: (ctx: StoreAttentionPaymentConfirmationContext) => Promise<void>;

  // Optional query hooks
  query_attention: (ctx: QueryAttentionContext) => Promise<QueryAttentionResult>;

  // Matching lifecycle hooks
  before_create_match: (ctx: BeforeCreateMatchContext) => Promise<BeforeCreateMatchResult>;
  after_create_match: (ctx: AfterCreateMatchContext) => Promise<void>;
  before_publish_match: (ctx: BeforePublishMatchContext) => Promise<BeforePublishMatchResult>;
  after_publish_match: (ctx: AfterPublishMatchContext) => Promise<void>;

  // Marketplace publishing lifecycle hooks
  before_publish_marketplace: (ctx: BeforePublishMarketplaceContext) => Promise<BeforePublishMarketplaceResult>;
  after_publish_marketplace: (ctx: AfterPublishMarketplaceContext) => Promise<void>;

  // Confirmation lifecycle hooks
  on_billboard_confirmation: (ctx: OnBillboardConfirmationContext) => Promise<void>;
  on_attention_confirmation: (ctx: OnAttentionConfirmationContext) => Promise<void>;
  before_publish_marketplace_confirmation: (ctx: BeforePublishMarketplaceConfirmationContext) => Promise<BeforePublishMarketplaceConfirmationResult>;
  after_publish_marketplace_confirmation: (ctx: AfterPublishMarketplaceConfirmationContext) => Promise<void>;
  on_attention_payment_confirmation: (ctx: OnAttentionPaymentConfirmationContext) => Promise<void>;

  // Block boundary hook
  block_boundary: (ctx: BlockBoundaryContext) => Promise<void>;

  // Validation hooks
  validate_promotion: (ctx: ValidatePromotionContext) => Promise<ValidationResult>;
  validate_attention: (ctx: ValidateAttentionContext) => Promise<ValidationResult>;
}

/**
 * Hook handler type for a specific hook name.
 *
 * @typeParam T - The hook name
 *
 * @example
 * ```ts
 * const handler: HookHandler<'store_promotion'> = async (ctx) => {
 *   await db.promotions.insert(ctx.event);
 * };
 * ```
 */
export type HookHandler<T extends HookName> = HookHandlers[T];

/**
 * Handle returned when registering a hook handler.
 *
 * Use the `unregister` method to remove the handler.
 *
 * @example
 * ```ts
 * const handle = marketplace.on_store_promotion(handler);
 * // Later, to remove the handler:
 * handle.unregister();
 * ```
 */
export interface HookHandle {
  /** Remove this handler from the hook */
  unregister: () => void;
}
