/**
 * Configuration types for the ATTN Marketplace.
 *
 * Defines the structure for marketplace initialization including
 * relay configuration, marketplace parameters, and identity settings.
 *
 * @module
 */

import type { Pubkey, RelayUrl } from '@attn-protocol/core';
import type { ProfileConfig } from '@attn-protocol/framework';

/**
 * Relay configuration for reading and writing events.
 *
 * Separates relays by authentication requirements.
 *
 * @example
 * ```ts
 * const relays: RelayConfig = {
 *   read_auth: ['wss://auth-relay.example.com'],
 *   read_noauth: ['wss://public-relay.example.com'],
 *   write_auth: ['wss://auth-relay.example.com'],
 *   write_noauth: ['wss://public-relay.example.com'],
 * };
 * ```
 */
export interface RelayConfig {
  /** Relay URLs for reading events (require auth) */
  read_auth?: RelayUrl[];
  /** Relay URLs for reading events (no auth) */
  read_noauth?: RelayUrl[];
  /** Relay URLs for writing events (require auth) */
  write_auth?: RelayUrl[];
  /** Relay URLs for writing events (no auth) */
  write_noauth?: RelayUrl[];
}

/**
 * Main configuration for initializing a Marketplace.
 *
 * @example
 * ```ts
 * const config: MarketplaceConfig = {
 *   // Identity
 *   private_key: process.env.MARKETPLACE_KEY!,
 *   marketplace_id: 'my-marketplace',
 *   name: 'My Marketplace',
 *
 *   // Infrastructure
 *   node_pubkey: process.env.NODE_PUBKEY!,
 *   relay_config: {
 *     read_auth: ['wss://auth-relay.example.com'],
 *     read_noauth: ['wss://public-relay.example.com'],
 *     write_auth: ['wss://auth-relay.example.com'],
 *     write_noauth: ['wss://public-relay.example.com'],
 *   },
 * };
 * ```
 */
export interface MarketplaceConfig {
  /** Private key for signing events (hex or nsec) */
  private_key: string;

  /** Marketplace identifier (used in d tag) */
  marketplace_id: string;

  /** Node pubkey to follow for block events */
  node_pubkey: Pubkey;

  /** Relay configuration */
  relay_config: RelayConfig;

  /** Marketplace display name */
  name: string;

  /** Marketplace description */
  description?: string;

  /** Minimum duration in milliseconds (default: 15000) */
  min_duration?: number;

  /** Maximum duration in milliseconds (default: 60000) */
  max_duration?: number;

  /** Fee charged per match in satoshis (default: 0) */
  match_fee_sats?: number;

  /** Fee charged per confirmation in satoshis (default: 0) */
  confirmation_fee_sats?: number;

  /** Supported content kinds (default: [34236]) */
  kind_list?: number[];

  /** Website URL for the marketplace */
  website_url?: string;

  /** Auto-publish marketplace event on block boundary (default: true) */
  auto_publish_marketplace?: boolean;

  /** Auto-run matching when attention/promotion received (default: true) */
  auto_match?: boolean;

  /** Profile metadata for kind 0 event (optional) */
  profile?: ProfileConfig;

  /** Follow list pubkeys for kind 3 event (optional) */
  follows?: string[];

  /** Auto-publish profile on connect (default: true if profile is set) */
  publish_profile_on_connect?: boolean;
}
