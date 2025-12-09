/**
 * Type exports for the ATTN Marketplace package.
 *
 * Re-exports types from core and defines marketplace-specific types
 * for configuration and hook contexts.
 *
 * @module
 */

// Re-export event content types from core
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

// Config types
export type {
  RelayConfig,
  MarketplaceConfig,
} from './config.ts';

// Hook context and result types
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
} from './hooks.ts';
