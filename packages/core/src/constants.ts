/**
 * Shared constants for ATTN Protocol event kinds and list identifiers
 */

export const ATTN_EVENT_KINDS = {
  BLOCK: 38088,
  MARKETPLACE: 38188,
  BILLBOARD: 38288,
  PROMOTION: 38388,
  ATTENTION: 38488,
  BILLBOARD_CONFIRMATION: 38588,
  ATTENTION_CONFIRMATION: 38688,
  MARKETPLACE_CONFIRMATION: 38788,
  MATCH: 38888,
  ATTENTION_PAYMENT_CONFIRMATION: 38988,
} as const;

export const NIP51_LIST_TYPES = {
  BLOCKED_PROMOTIONS: 'org.attnprotocol:promotion:blocked',
  BLOCKED_PROMOTERS: 'org.attnprotocol:promoter:blocked',
  TRUSTED_BILLBOARDS: 'org.attnprotocol:billboard:trusted',
  TRUSTED_MARKETPLACES: 'org.attnprotocol:marketplace:trusted',
} as const;

