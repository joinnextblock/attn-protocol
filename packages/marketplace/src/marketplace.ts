/**
 * Marketplace - Main class for @attn-protocol/marketplace
 * Wraps @attn-protocol/framework and adds marketplace-specific lifecycle hooks
 */

import { Attn } from '@attn-protocol/framework';
import { AttnSdk } from '@attn-protocol/sdk';
import { ATTN_EVENT_KINDS } from '@attn-protocol/core';
import { nip19 } from 'nostr-tools';
import type { Event } from 'nostr-tools';
import type {
  PromotionData,
  AttentionData,
  BillboardData,
  MatchData,
  MarketplaceData,
  BillboardConfirmationData,
  AttentionConfirmationData,
  MarketplaceConfirmationData,
  AttentionPaymentConfirmationData,
} from '@attn-protocol/core';
import type { MarketplaceConfig } from './types/config.js';
import type { HookName, HookHandler } from './hooks/types.js';
import type { MatchCandidate, ExistsResult, QueryPromotionsResult, FindMatchesResult, AggregatesResult } from './types/hooks.js';
import { HookEmitter, validate_required_hooks } from './hooks/index.js';
import {
  extract_block_height,
  extract_d_tag,
  extract_coordinate,
  extract_marketplace_coordinate,
  parse_content,
} from './utils/extraction.js';

/**
 * Decode private key from hex or nsec format to Uint8Array
 */
function decode_private_key(key: string): Uint8Array {
  if (key.startsWith('nsec')) {
    const decoded = nip19.decode(key);
    if (decoded.type !== 'nsec') {
      throw new Error('Invalid nsec format');
    }
    return decoded.data as Uint8Array;
  }
  // Assume hex string - convert to Uint8Array
  const bytes = new Uint8Array(key.length / 2);
  for (let i = 0; i < key.length; i += 2) {
    bytes[i / 2] = parseInt(key.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Marketplace class
 * Layers marketplace-specific lifecycle hooks on top of @attn-protocol/framework
 */
export class Marketplace {
  private framework: Attn;
  private sdk: AttnSdk;
  private hooks: HookEmitter;
  private config: MarketplaceConfig;
  private current_block_height: number | null = null;

  constructor(config: MarketplaceConfig) {
    this.config = config;
    this.hooks = new HookEmitter();
    this.sdk = new AttnSdk({ private_key: config.private_key });

    // Decode private key for framework
    const private_key_bytes = decode_private_key(config.private_key);

    // Initialize framework with proper relay config and profile publishing
    this.framework = new Attn({
      relays_auth: config.relay_config.read_auth,
      relays_noauth: config.relay_config.read_noauth,
      relays_write_auth: config.relay_config.write_auth,
      relays_write_noauth: config.relay_config.write_noauth,
      private_key: private_key_bytes,
      node_pubkeys: [config.node_pubkey],
      profile: config.profile,
      follows: config.follows,
      publish_identity_on_connect: config.publish_profile_on_connect,
    });

    this.wire_framework_events();
  }

  /**
   * Register a hook handler
   * @param name - Hook name
   * @param handler - Handler function
   */
  on<T extends HookName>(name: T, handler: HookHandler<T>): this {
    this.hooks.register(name, handler);
    return this;
  }

  /**
   * Start the marketplace
   * Validates required hooks and connects to relays
   */
  async start(): Promise<void> {
    validate_required_hooks(this.hooks);
    await this.framework.connect();
  }

  /**
   * Stop the marketplace
   */
  async stop(): Promise<void> {
    await this.framework.disconnect();
  }

  /**
   * Access underlying @attn-protocol/framework instance
   */
  get attn(): Attn {
    return this.framework;
  }

  /**
   * Get current block height
   */
  get block_height(): number | null {
    return this.current_block_height;
  }

  /**
   * Get marketplace pubkey
   */
  get pubkey(): string {
    return this.sdk.get_public_key();
  }

  /**
   * Wire framework events to marketplace hooks
   */
  private wire_framework_events(): void {
    // Billboard events
    this.framework.on_billboard_event(async (ctx) => {
      await this.handle_billboard(ctx.event, ctx.billboard_data as BillboardData);
    });

    // Promotion events
    this.framework.on_promotion_event(async (ctx) => {
      await this.handle_promotion(ctx.event, ctx.promotion_data as PromotionData);
    });

    // Attention events
    this.framework.on_attention_event(async (ctx) => {
      await this.handle_attention(ctx.event, ctx.attention_data as AttentionData);
    });

    // Match events (external)
    this.framework.on_match_event(async (ctx) => {
      await this.handle_match(ctx.event, ctx.match_data as MatchData);
    });

    // Marketplace events
    this.framework.on_marketplace_event(async (ctx) => {
      await this.handle_marketplace(ctx.event, ctx.marketplace_data as MarketplaceData);
    });

    // Block events
    this.framework.on_block_event(async (ctx) => {
      await this.handle_block(ctx.block_height, ctx.block_hash);
    });

    // Confirmation events
    this.framework.on_billboard_confirmation_event(async (ctx) => {
      await this.handle_billboard_confirmation(ctx.event, ctx.confirmation_data as BillboardConfirmationData);
    });

    this.framework.on_attention_confirmation_event(async (ctx) => {
      await this.handle_attention_confirmation(ctx.event, ctx.confirmation_data as AttentionConfirmationData);
    });

    this.framework.on_marketplace_confirmation_event(async (ctx) => {
      await this.handle_marketplace_confirmation(ctx.event, ctx.settlement_data as MarketplaceConfirmationData);
    });

    this.framework.on_attention_payment_confirmation_event(async (ctx) => {
      await this.handle_attention_payment_confirmation(ctx.event, ctx.payment_data as AttentionPaymentConfirmationData);
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // EVENT HANDLERS
  // ═══════════════════════════════════════════════════════════════

  private async handle_billboard(event: Event, data: BillboardData): Promise<void> {
    const block_height = extract_block_height(event);
    const d_tag = extract_d_tag(event);
    const coordinate = extract_coordinate(event);

    if (!block_height || !d_tag || !coordinate) {
      return; // Invalid event
    }

    // Check if already processed
    const exists_result = await this.hooks.emit_required('exists', {
      event_id: event.id,
      event_type: 'billboard',
    }) as ExistsResult;

    if (exists_result.exists) {
      return; // Already processed
    }

    // Store billboard
    await this.hooks.emit_required('store_billboard', {
      event,
      data,
      block_height,
      d_tag,
      coordinate,
    });
  }

  private async handle_promotion(event: Event, data: PromotionData): Promise<void> {
    const block_height = extract_block_height(event);
    const d_tag = extract_d_tag(event);
    const coordinate = extract_coordinate(event);

    if (!block_height || !d_tag || !coordinate) {
      return;
    }

    // Check if already processed
    const exists_result = await this.hooks.emit_required('exists', {
      event_id: event.id,
      event_type: 'promotion',
    }) as ExistsResult;

    if (exists_result.exists) {
      return;
    }

    // Optional: validate promotion
    if (this.hooks.has('validate_promotion')) {
      const validation = await this.hooks.emit('validate_promotion', {
        event,
        data,
        block_height,
      });
      if (validation && !validation.valid) {
        return; // Validation failed
      }
    }

    // Store promotion
    await this.hooks.emit_required('store_promotion', {
      event,
      data,
      block_height,
      d_tag,
      coordinate,
    });

    // Optionally trigger matching (promotion -> attention)
    if (this.config.auto_match !== false && this.hooks.has('query_attention')) {
      // Query attention for this promotion's marketplace
      const marketplace_coordinate = extract_marketplace_coordinate(event);
      if (marketplace_coordinate) {
        // This is optional - only if query_attention is implemented
        await this.try_match_promotion(event, data, marketplace_coordinate, block_height);
      }
    }
  }

  private async handle_attention(event: Event, data: AttentionData): Promise<void> {
    const block_height = extract_block_height(event);
    const d_tag = extract_d_tag(event);
    const coordinate = extract_coordinate(event);

    if (!block_height || !d_tag || !coordinate) {
      return;
    }

    // Check if already processed
    const exists_result = await this.hooks.emit_required('exists', {
      event_id: event.id,
      event_type: 'attention',
    }) as ExistsResult;

    if (exists_result.exists) {
      return;
    }

    // Optional: validate attention
    if (this.hooks.has('validate_attention')) {
      const validation = await this.hooks.emit('validate_attention', {
        event,
        data,
        block_height,
      });
      if (validation && !validation.valid) {
        return;
      }
    }

    // Store attention
    await this.hooks.emit_required('store_attention', {
      event,
      data,
      block_height,
      d_tag,
      coordinate,
    });

    // Trigger matching (attention -> promotions)
    if (this.config.auto_match !== false) {
      const marketplace_coordinate = extract_marketplace_coordinate(event);
      if (marketplace_coordinate) {
        await this.try_match_attention(event, data, marketplace_coordinate, coordinate, block_height);
      }
    }
  }

  private async handle_match(event: Event, data: MatchData): Promise<void> {
    const block_height = extract_block_height(event);
    const d_tag = extract_d_tag(event);
    const coordinate = extract_coordinate(event);

    if (!block_height || !d_tag || !coordinate) {
      return;
    }

    // Check if already processed
    const exists_result = await this.hooks.emit_required('exists', {
      event_id: event.id,
      event_type: 'match',
    }) as ExistsResult;

    if (exists_result.exists) {
      return;
    }

    // Store match (external matches from other marketplaces)
    await this.hooks.emit_required('store_match', {
      event,
      data,
      block_height,
      d_tag,
      coordinate,
    });
  }

  private async handle_marketplace(event: Event, data: MarketplaceData): Promise<void> {
    // Optional: store marketplace events
    if (!this.hooks.has('store_marketplace')) {
      return;
    }

    const block_height = extract_block_height(event);
    const d_tag = extract_d_tag(event);
    const coordinate = extract_coordinate(event);

    if (!block_height || !d_tag || !coordinate) {
      return;
    }

    await this.hooks.emit('store_marketplace', {
      event,
      data,
      block_height,
      d_tag,
      coordinate,
    });
  }

  private async handle_block(block_height: number, block_hash?: string): Promise<void> {
    const previous_block_height = this.current_block_height;
    this.current_block_height = block_height;

    // Emit block boundary hook
    if (this.hooks.has('block_boundary')) {
      await this.hooks.emit('block_boundary', {
        block_height,
        block_hash,
        previous_block_height: previous_block_height ?? undefined,
      });
    }

    // Auto-publish marketplace event
    if (this.config.auto_publish_marketplace !== false) {
      await this.publish_marketplace_event(block_height, block_hash);
    }
  }

  private async handle_billboard_confirmation(event: Event, data: BillboardConfirmationData): Promise<void> {
    const block_height = extract_block_height(event);
    if (!block_height) return;

    // Emit hook
    if (this.hooks.has('on_billboard_confirmation')) {
      await this.hooks.emit('on_billboard_confirmation', {
        event,
        data,
        block_height,
      });
    }

    // Optional: store
    if (this.hooks.has('store_billboard_confirmation')) {
      const d_tag = extract_d_tag(event);
      const coordinate = extract_coordinate(event);
      if (d_tag && coordinate) {
        await this.hooks.emit('store_billboard_confirmation', {
          event,
          data,
          block_height,
          d_tag,
          coordinate,
        });
      }
    }
  }

  private async handle_attention_confirmation(event: Event, data: AttentionConfirmationData): Promise<void> {
    const block_height = extract_block_height(event);
    if (!block_height) return;

    // Emit hook
    if (this.hooks.has('on_attention_confirmation')) {
      await this.hooks.emit('on_attention_confirmation', {
        event,
        data,
        block_height,
      });
    }

    // Optional: store
    if (this.hooks.has('store_attention_confirmation')) {
      const d_tag = extract_d_tag(event);
      const coordinate = extract_coordinate(event);
      if (d_tag && coordinate) {
        await this.hooks.emit('store_attention_confirmation', {
          event,
          data,
          block_height,
          d_tag,
          coordinate,
        });
      }
    }
  }

  private async handle_marketplace_confirmation(event: Event, data: MarketplaceConfirmationData): Promise<void> {
    const block_height = extract_block_height(event);
    if (!block_height) return;

    // Optional: store
    if (this.hooks.has('store_marketplace_confirmation')) {
      const d_tag = extract_d_tag(event);
      const coordinate = extract_coordinate(event);
      if (d_tag && coordinate) {
        await this.hooks.emit('store_marketplace_confirmation', {
          event,
          data,
          block_height,
          d_tag,
          coordinate,
        });
      }
    }
  }

  private async handle_attention_payment_confirmation(event: Event, data: AttentionPaymentConfirmationData): Promise<void> {
    const block_height = extract_block_height(event);
    if (!block_height) return;

    // Emit hook
    if (this.hooks.has('on_attention_payment_confirmation')) {
      await this.hooks.emit('on_attention_payment_confirmation', {
        event,
        data,
        block_height,
      });
    }

    // Optional: store
    if (this.hooks.has('store_attention_payment_confirmation')) {
      const d_tag = extract_d_tag(event);
      const coordinate = extract_coordinate(event);
      if (d_tag && coordinate) {
        await this.hooks.emit('store_attention_payment_confirmation', {
          event,
          data,
          block_height,
          d_tag,
          coordinate,
        });
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // MATCHING
  // ═══════════════════════════════════════════════════════════════

  private async try_match_attention(
    attention_event: Event,
    attention_data: AttentionData,
    marketplace_coordinate: string,
    attention_coordinate: string,
    block_height: number
  ): Promise<void> {
    // Query matching promotions
    const query_result = await this.hooks.emit_required('query_promotions', {
      marketplace_coordinate,
      min_bid: attention_data.ask,
      min_duration: attention_data.min_duration,
      max_duration: attention_data.max_duration,
      block_height,
    }) as QueryPromotionsResult;

    if (query_result.promotions.length === 0) {
      return;
    }

    // Build candidates
    const candidates: MatchCandidate[] = query_result.promotions.map(p => ({
      promotion_event: p.event,
      promotion_data: p.data,
      promotion_coordinate: p.coordinate,
      attention_event,
      attention_data,
      attention_coordinate,
    }));

    // Find matches
    const matches_result = await this.hooks.emit_required('find_matches', {
      trigger: 'attention',
      attention_event,
      attention_data,
      candidates,
      block_height,
    }) as FindMatchesResult;

    // Create and publish each match
    for (const match of matches_result.matches) {
      await this.create_and_publish_match(match, block_height);
    }
  }

  private async try_match_promotion(
    promotion_event: Event,
    promotion_data: PromotionData,
    marketplace_coordinate: string,
    block_height: number
  ): Promise<void> {
    // Only if query_attention is implemented
    if (!this.hooks.has('query_attention')) {
      return;
    }

    const query_result = await this.hooks.emit('query_attention', {
      marketplace_coordinate,
      max_ask: promotion_data.bid,
      duration: promotion_data.duration,
      block_height,
    });

    if (!query_result || query_result.attention.length === 0) {
      return;
    }

    const promotion_coordinate = extract_coordinate(promotion_event);
    if (!promotion_coordinate) return;

    // Build candidates
    const candidates: MatchCandidate[] = query_result.attention.map(a => ({
      promotion_event,
      promotion_data,
      promotion_coordinate,
      attention_event: a.event,
      attention_data: a.data,
      attention_coordinate: a.coordinate,
    }));

    // Find matches
    const matches_result = await this.hooks.emit_required('find_matches', {
      trigger: 'promotion',
      promotion_event,
      promotion_data,
      candidates,
      block_height,
    }) as FindMatchesResult;

    // Create and publish each match
    for (const match of matches_result.matches) {
      await this.create_and_publish_match(match, block_height);
    }
  }

  private async create_and_publish_match(
    candidate: MatchCandidate,
    block_height: number
  ): Promise<void> {
    // Before create match hook
    if (this.hooks.has('before_create_match')) {
      const result = await this.hooks.emit('before_create_match', {
        promotion_event: candidate.promotion_event,
        promotion_data: candidate.promotion_data,
        attention_event: candidate.attention_event,
        attention_data: candidate.attention_data,
        block_height,
      });
      if (result && !result.proceed) {
        return; // Skipped
      }
    }

    // Extract IDs for match
    const promotion_d_tag = extract_d_tag(candidate.promotion_event);
    const attention_d_tag = extract_d_tag(candidate.attention_event);
    const marketplace_coordinate = extract_marketplace_coordinate(candidate.promotion_event);
    const billboard_coordinate = candidate.promotion_event.tags.find(t => t[0] === 'a' && t[1]?.startsWith('38288:'))?.[1];

    if (!promotion_d_tag || !attention_d_tag || !marketplace_coordinate || !billboard_coordinate) {
      return; // Missing required data
    }

    // Parse IDs from d tags
    const promotion_id = promotion_d_tag.split(':').pop() ?? promotion_d_tag;
    const attention_id = attention_d_tag.split(':').pop() ?? attention_d_tag;
    const marketplace_id = this.config.marketplace_id;

    // Parse billboard info
    const billboard_parts = billboard_coordinate.split(':');
    const billboard_pubkey = billboard_parts[1] ?? '';
    const billboard_id = billboard_parts.slice(2).join(':').split(':').pop() ?? '';

    // Create match ID
    const match_id = `${candidate.promotion_event.id}-${candidate.attention_event.id}`;

    // Create match event using SDK
    const match_event = this.sdk.create_match({
      match_id,
      block_height,
      marketplace_coordinate,
      billboard_coordinate,
      promotion_coordinate: candidate.promotion_coordinate,
      attention_coordinate: candidate.attention_coordinate,
      marketplace_pubkey: this.pubkey,
      promotion_pubkey: candidate.promotion_event.pubkey,
      attention_pubkey: candidate.attention_event.pubkey,
      billboard_pubkey,
      marketplace_id,
      billboard_id,
      promotion_id,
      attention_id,
    });

    // Get relay URLs
    let relay_urls = [
      ...(this.config.relay_config.write_auth ?? []),
      ...(this.config.relay_config.write_noauth ?? []),
    ];

    // Before publish match hook
    let final_event = match_event;
    if (this.hooks.has('before_publish_match')) {
      const result = await this.hooks.emit('before_publish_match', {
        match_event,
        promotion_event: candidate.promotion_event,
        attention_event: candidate.attention_event,
        relay_urls,
      });
      if (result) {
        if (!result.proceed) {
          return; // Skipped
        }
        if (result.modified_event) {
          final_event = result.modified_event;
        }
        if (result.relay_urls) {
          relay_urls = result.relay_urls;
        }
      }
    }

    // Publish to relays
    const publish_results = await this.sdk.publish_to_multiple(
      final_event,
      relay_urls
    );

    // After publish match hook
    if (this.hooks.has('after_publish_match')) {
      await this.hooks.emit('after_publish_match', {
        match_event: final_event,
        publish_results: publish_results.results.map(r => ({
          relay_url: r.relay_url,
          success: r.success,
          error: r.error,
        })),
      });
    }

    // Store the match
    const match_d_tag = extract_d_tag(final_event);
    const match_coordinate = extract_coordinate(final_event);

    if (match_d_tag && match_coordinate) {
      const match_data = parse_content<MatchData>(final_event) ?? {};
      await this.hooks.emit_required('store_match', {
        event: final_event,
        data: match_data,
        block_height,
        d_tag: match_d_tag,
        coordinate: match_coordinate,
      });
    }

    // After create match hook
    if (this.hooks.has('after_create_match')) {
      const match_data = parse_content<MatchData>(final_event) ?? {};
      await this.hooks.emit('after_create_match', {
        match_event: final_event,
        match_data,
        promotion_event: candidate.promotion_event,
        attention_event: candidate.attention_event,
        block_height,
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // MARKETPLACE PUBLISHING
  // ═══════════════════════════════════════════════════════════════

  private async publish_marketplace_event(block_height: number, block_hash?: string): Promise<void> {
    // Get aggregates
    const aggregates = await this.hooks.emit_required('get_aggregates', {
      block_height,
    }) as AggregatesResult;

    // Build block reference
    const block_id = `org.attnprotocol:block:${block_height}:${block_hash ?? '0'.repeat(64)}`;
    const block_coordinate = `${ATTN_EVENT_KINDS.BLOCK}:${this.config.node_pubkey}:${block_id}`;

    // Create marketplace event
    const marketplace_event = this.sdk.create_marketplace({
      name: this.config.marketplace_params.name,
      description: this.config.marketplace_params.description ?? '',
      kind_list: this.config.marketplace_params.kind_list ?? [34236],
      relay_list: [
        ...(this.config.relay_config.read_auth ?? []),
        ...(this.config.relay_config.read_noauth ?? []),
        ...(this.config.relay_config.write_auth ?? []),
        ...(this.config.relay_config.write_noauth ?? []),
      ],
      admin_pubkey: this.pubkey,
      min_duration: this.config.marketplace_params.min_duration ?? 15000,
      max_duration: this.config.marketplace_params.max_duration ?? 60000,
      match_fee_sats: this.config.marketplace_params.match_fee_sats ?? 0,
      confirmation_fee_sats: this.config.marketplace_params.confirmation_fee_sats ?? 0,
      marketplace_id: this.config.marketplace_id,
      website_url: this.config.marketplace_params.website_url,
      marketplace_pubkey: this.pubkey,
      block_height,
      ref_node_pubkey: this.config.node_pubkey,
      ref_block_id: block_id,
      block_coordinate,
      billboard_count: aggregates.billboard_count,
      promotion_count: aggregates.promotion_count,
      attention_count: aggregates.attention_count,
      match_count: aggregates.match_count,
    });

    // Before publish marketplace hook
    let final_event = marketplace_event;
    if (this.hooks.has('before_publish_marketplace')) {
      const result = await this.hooks.emit('before_publish_marketplace', {
        marketplace_event,
        block_height,
        aggregates,
      });
      if (result) {
        if (!result.proceed) {
          return; // Skipped
        }
        if (result.modified_event) {
          final_event = result.modified_event;
        }
      }
    }

    // Publish to relays
    const relay_urls = [
      ...(this.config.relay_config.write_auth ?? []),
      ...(this.config.relay_config.write_noauth ?? []),
    ];

    const publish_results = await this.sdk.publish_to_multiple(
      final_event,
      relay_urls
    );

    // After publish marketplace hook
    if (this.hooks.has('after_publish_marketplace')) {
      await this.hooks.emit('after_publish_marketplace', {
        marketplace_event: final_event,
        publish_results: publish_results.results.map(r => ({
          relay_url: r.relay_url,
          success: r.success,
          error: r.error,
        })),
      });
    }
  }
}
