/**
 * @attn-protocol/marketplace
 *
 * Marketplace lifecycle layer on top of @attn-protocol/framework.
 * Bring your own storage implementation.
 */

// Main class
export { Marketplace } from './marketplace.js';

// Config types
export type {
  RelayConfig,
  MarketplaceParams,
  MarketplaceConfig,
} from './types/config.js';

// Event content types (re-exported from core)
export type {
  BlockData,
  MarketplaceData,
  BillboardData,
  PromotionData,
  AttentionData,
  MatchData,
  BillboardConfirmationData,
  AttentionConfirmationData,
  MarketplaceConfirmationData,
  AttentionPaymentConfirmationData,
} from '@attn-protocol/core';

// Profile config (re-exported from framework)
export type { ProfileConfig } from '@attn-protocol/framework';

// Hook types
export type {
  StoreEventContext,
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
  MatchCandidate,
  FindMatchesContext,
  FindMatchesResult,
  BeforeCreateMatchContext,
  BeforeCreateMatchResult,
  AfterCreateMatchContext,
  BeforePublishMatchContext,
  BeforePublishMatchResult,
  PublishResultItem,
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
} from './types/hooks.js';

// Hook system
export {
  REQUIRED_HOOKS,
  OPTIONAL_HOOKS,
} from './hooks/types.js';

export type {
  RequiredHook,
  OptionalHook,
  HookName,
  HookHandler,
  HookHandlers,
} from './hooks/types.js';

export {
  MissingHooksError,
} from './hooks/validation.js';

// Utilities
export {
  extract_block_height,
  extract_d_tag,
  build_coordinate,
  extract_coordinate,
  extract_a_tag_by_prefix,
  extract_marketplace_coordinate,
  extract_billboard_coordinate,
  extract_promotion_coordinate,
  extract_attention_coordinate,
  extract_match_coordinate,
  parse_coordinate,
  parse_content,
} from './utils/extraction.js';
