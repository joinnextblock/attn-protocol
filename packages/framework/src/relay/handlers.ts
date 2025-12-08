/**
 * Event handlers for ATTN Protocol and standard Nostr events
 * Uses a handler factory pattern to eliminate repetitive code
 *
 * The framework parses event content but does NOT extract tags.
 * Tags are for relay filtering only - all data is in the content JSON.
 * Implementations extract what they need from the event or parsed content.
 */

import type { Event } from 'nostr-tools';
import { ATTN_EVENT_KINDS } from '@attn-protocol/core';
import { HookEmitter } from '../hooks/emitter.js';
import { HOOK_NAMES } from '../hooks/index.js';
import type { Logger } from '../logger.js';
import type {
  HookContext,
  BlockEventContext,
  BlockData,
  MarketplaceEventContext,
  BillboardEventContext,
  PromotionEventContext,
  AttentionEventContext,
  MatchEventContext,
  MatchPublishedContext,
  BillboardConfirmationEventContext,
  AttentionConfirmationEventContext,
  MarketplaceConfirmationEventContext,
  AttentionPaymentConfirmationEventContext,
  ProfileEventContext,
  RelayListEventContext,
  Nip51ListEventContext,
} from '../hooks/types.js';

// ============================================================================
// Constants for standard Nostr event kinds
// ============================================================================

const NOSTR_EVENT_KINDS = {
  PROFILE: 0,
  RELAY_LIST: 10002,
  NIP51_LIST: 30000,
} as const;

// ============================================================================
// Configuration
// ============================================================================

/**
 * Configuration for event handler
 */
export interface EventHandlerConfig {
  hooks: HookEmitter;
  logger: Logger;
  relay_url: string;
}

/**
 * Hook names for lifecycle events
 */
interface LifecycleHooks {
  before: string;
  on: string;
  after: string;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generic lifecycle hook emitter
 * Handles the before → on → after pattern
 */
async function emit_lifecycle_hooks<T extends HookContext>(
  hooks: HookEmitter,
  lifecycle: LifecycleHooks,
  context: T
): Promise<void> {
  if (hooks.has_handlers(lifecycle.before)) {
    await hooks.emit(lifecycle.before, context);
  }
  await hooks.emit(lifecycle.on, context);
  if (hooks.has_handlers(lifecycle.after)) {
    await hooks.emit(lifecycle.after, context);
  }
}

/**
 * Parse event content as JSON, falling back to raw string
 */
function parse_content(content: string): unknown {
  try {
    return JSON.parse(content);
  } catch {
    return content;
  }
}

/**
 * Create error logging function
 */
function log_error(logger: Logger, relay_url: string, event_id: string, error: unknown, message: string): void {
  logger.error(
    {
      relay_url,
      event_id,
      error: error instanceof Error ? error.message : String(error),
    },
    message
  );
}

// ============================================================================
// Handler Factory
// ============================================================================

/**
 * Context builder function type
 */
type ContextBuilder<T extends HookContext> = (event: Event) => T;

/**
 * Creates a simple event handler with standard lifecycle hooks
 * Used for events that follow the pattern: parse content → build context → emit hooks
 */
function create_simple_handler<T extends HookContext>(
  config: EventHandlerConfig,
  context_builder: ContextBuilder<T>,
  lifecycle: LifecycleHooks,
  error_message: string
): (event: Event) => Promise<void> {
  return async (event: Event): Promise<void> => {
    try {
      const context = context_builder(event);
      await emit_lifecycle_hooks(config.hooks, lifecycle, context);
    } catch (error) {
      log_error(config.logger, config.relay_url, event.id, error, error_message);
    }
  };
}

// ============================================================================
// Event Handlers Class
// ============================================================================

/**
 * Event handlers class - manages all ATTN Protocol and standard Nostr event handling
 */
export class EventHandlers {
  private config: EventHandlerConfig;

  // Pre-built simple handlers (created once in constructor)
  private _handle_marketplace: (event: Event) => Promise<void>;
  private _handle_billboard: (event: Event) => Promise<void>;
  private _handle_promotion: (event: Event) => Promise<void>;
  private _handle_attention: (event: Event) => Promise<void>;
  private _handle_profile: (event: Event) => Promise<void>;
  private _handle_relay_list: (event: Event) => Promise<void>;

  constructor(config: EventHandlerConfig) {
    this.config = config;

    // Initialize simple handlers using factory
    // Each handler provides: event_id, pubkey, parsed content, and raw event
    this._handle_marketplace = create_simple_handler<MarketplaceEventContext>(
      config,
      (event) => ({
        event_id: event.id,
        pubkey: event.pubkey,
        marketplace_data: parse_content(event.content),
        event,
      }),
      {
        before: HOOK_NAMES.BEFORE_MARKETPLACE_EVENT,
        on: HOOK_NAMES.MARKETPLACE_EVENT,
        after: HOOK_NAMES.AFTER_MARKETPLACE_EVENT,
      },
      'Error handling marketplace event'
    );

    this._handle_billboard = create_simple_handler<BillboardEventContext>(
      config,
      (event) => ({
        event_id: event.id,
        pubkey: event.pubkey,
        billboard_data: parse_content(event.content),
        event,
      }),
      {
        before: HOOK_NAMES.BEFORE_BILLBOARD_EVENT,
        on: HOOK_NAMES.BILLBOARD_EVENT,
        after: HOOK_NAMES.AFTER_BILLBOARD_EVENT,
      },
      'Error handling billboard event'
    );

    this._handle_promotion = create_simple_handler<PromotionEventContext>(
      config,
      (event) => ({
        event_id: event.id,
        pubkey: event.pubkey,
        promotion_data: parse_content(event.content),
        event,
      }),
      {
        before: HOOK_NAMES.BEFORE_PROMOTION_EVENT,
        on: HOOK_NAMES.PROMOTION_EVENT,
        after: HOOK_NAMES.AFTER_PROMOTION_EVENT,
      },
      'Error handling promotion event'
    );

    this._handle_attention = create_simple_handler<AttentionEventContext>(
      config,
      (event) => ({
        event_id: event.id,
        pubkey: event.pubkey,
        attention_data: parse_content(event.content),
        event,
      }),
      {
        before: HOOK_NAMES.BEFORE_ATTENTION_EVENT,
        on: HOOK_NAMES.ATTENTION_EVENT,
        after: HOOK_NAMES.AFTER_ATTENTION_EVENT,
      },
      'Error handling attention event'
    );

    this._handle_profile = create_simple_handler<ProfileEventContext>(
      config,
      (event) => ({
        event_id: event.id,
        pubkey: event.pubkey,
        profile_data: parse_content(event.content),
        event,
      }),
      {
        before: HOOK_NAMES.BEFORE_PROFILE_EVENT,
        on: HOOK_NAMES.PROFILE_EVENT,
        after: HOOK_NAMES.AFTER_PROFILE_EVENT,
      },
      'Error handling profile event'
    );

    this._handle_relay_list = create_simple_handler<RelayListEventContext>(
      config,
      (event) => ({
        event_id: event.id,
        pubkey: event.pubkey,
        relay_list_data: parse_content(event.content),
        event,
      }),
      {
        before: HOOK_NAMES.BEFORE_RELAY_LIST_EVENT,
        on: HOOK_NAMES.RELAY_LIST_EVENT,
        after: HOOK_NAMES.AFTER_RELAY_LIST_EVENT,
      },
      'Error handling relay list event'
    );
  }

  // ==========================================================================
  // Event Routers
  // ==========================================================================

  /**
   * Route ATTN Protocol events to appropriate handlers based on kind
   */
  async handle_attn_event(event: Event): Promise<void> {
    try {
      switch (event.kind) {
        case ATTN_EVENT_KINDS.MARKETPLACE:
          await this._handle_marketplace(event);
          break;
        case ATTN_EVENT_KINDS.BILLBOARD:
          await this._handle_billboard(event);
          break;
        case ATTN_EVENT_KINDS.PROMOTION:
          await this._handle_promotion(event);
          break;
        case ATTN_EVENT_KINDS.ATTENTION:
          await this._handle_attention(event);
          break;
        case ATTN_EVENT_KINDS.BILLBOARD_CONFIRMATION:
          await this.handle_billboard_confirmation(event);
          break;
        case ATTN_EVENT_KINDS.ATTENTION_CONFIRMATION:
          await this.handle_attention_confirmation(event);
          break;
        case ATTN_EVENT_KINDS.MARKETPLACE_CONFIRMATION:
          await this.handle_marketplace_confirmation(event);
          break;
        case ATTN_EVENT_KINDS.ATTENTION_PAYMENT_CONFIRMATION:
          await this.handle_attention_payment_confirmation(event);
          break;
        case ATTN_EVENT_KINDS.MATCH:
          await this.handle_match(event);
          break;
        default:
          this.config.logger.warn(
            { relay_url: this.config.relay_url, event_kind: event.kind, event_id: event.id },
            'Unknown ATTN Protocol event kind'
          );
      }
    } catch (error) {
      log_error(this.config.logger, this.config.relay_url, event.id, error, 'Error handling ATTN Protocol event');
    }
  }

  /**
   * Route standard Nostr events to appropriate handlers based on kind
   */
  async handle_standard_event(event: Event): Promise<void> {
    try {
      switch (event.kind) {
        case NOSTR_EVENT_KINDS.PROFILE:
          await this._handle_profile(event);
          break;
        case NOSTR_EVENT_KINDS.RELAY_LIST:
          await this._handle_relay_list(event);
          break;
        case NOSTR_EVENT_KINDS.NIP51_LIST:
          await this.handle_nip51_list(event);
          break;
        default:
          this.config.logger.warn(
            { relay_url: this.config.relay_url, event_kind: event.kind, event_id: event.id },
            'Unknown standard Nostr event kind'
          );
      }
    } catch (error) {
      log_error(this.config.logger, this.config.relay_url, event.id, error, 'Error handling standard Nostr event');
    }
  }

  // ==========================================================================
  // Special Handlers
  // ==========================================================================

  /**
   * Handle block event from relay (kind 38088)
   * Block height comes from parsed content (block_data.height)
   */
  async handle_block_event(event: Event): Promise<void> {
    try {
      const block_data = parse_content(event.content) as BlockData | null;

      // Block height comes from content
      const block_height =
        typeof block_data?.height === 'number'
          ? block_data.height
          : block_data?.height !== undefined
            ? parseInt(String(block_data.height), 10)
            : undefined;

      if (!block_height || Number.isNaN(block_height)) {
        this.config.logger.warn(
          { relay_url: this.config.relay_url, event_id: event.id },
          'Block event missing or invalid block_height in content'
        );
        return;
      }

      const context: BlockEventContext = {
        block_height,
        block_hash: block_data?.hash,
        block_time: block_data?.time,
        block_data: block_data ?? undefined,
        event,
        relay_url: this.config.relay_url,
      };

      await emit_lifecycle_hooks(this.config.hooks, {
        before: HOOK_NAMES.BEFORE_BLOCK_EVENT,
        on: HOOK_NAMES.BLOCK_EVENT,
        after: HOOK_NAMES.AFTER_BLOCK_EVENT,
      }, context);
    } catch (error) {
      log_error(this.config.logger, this.config.relay_url, event.id, error, 'Error handling block event');
    }
  }

  /**
   * Handle BILLBOARD_CONFIRMATION event (kind 38588)
   */
  private async handle_billboard_confirmation(event: Event): Promise<void> {
    try {
      const context: BillboardConfirmationEventContext = {
        event_id: event.id,
        pubkey: event.pubkey,
        confirmation_data: parse_content(event.content),
        event,
      };

      await emit_lifecycle_hooks(this.config.hooks, {
        before: HOOK_NAMES.BEFORE_BILLBOARD_CONFIRMATION_EVENT,
        on: HOOK_NAMES.BILLBOARD_CONFIRMATION_EVENT,
        after: HOOK_NAMES.AFTER_BILLBOARD_CONFIRMATION_EVENT,
      }, context);
    } catch (error) {
      log_error(this.config.logger, this.config.relay_url, event.id, error, 'Error handling billboard confirmation event');
    }
  }

  /**
   * Handle ATTENTION_CONFIRMATION event (kind 38688)
   */
  private async handle_attention_confirmation(event: Event): Promise<void> {
    try {
      const context: AttentionConfirmationEventContext = {
        event_id: event.id,
        pubkey: event.pubkey,
        confirmation_data: parse_content(event.content),
        event,
      };

      await emit_lifecycle_hooks(this.config.hooks, {
        before: HOOK_NAMES.BEFORE_ATTENTION_CONFIRMATION_EVENT,
        on: HOOK_NAMES.ATTENTION_CONFIRMATION_EVENT,
        after: HOOK_NAMES.AFTER_ATTENTION_CONFIRMATION_EVENT,
      }, context);
    } catch (error) {
      log_error(this.config.logger, this.config.relay_url, event.id, error, 'Error handling attention confirmation event');
    }
  }

  /**
   * Handle MARKETPLACE_CONFIRMATION event (kind 38788)
   */
  private async handle_marketplace_confirmation(event: Event): Promise<void> {
    try {
      const context: MarketplaceConfirmationEventContext = {
        event_id: event.id,
        pubkey: event.pubkey,
        settlement_data: parse_content(event.content),
        event,
      };

      await emit_lifecycle_hooks(this.config.hooks, {
        before: HOOK_NAMES.BEFORE_MARKETPLACE_CONFIRMATION_EVENT,
        on: HOOK_NAMES.MARKETPLACE_CONFIRMATION_EVENT,
        after: HOOK_NAMES.AFTER_MARKETPLACE_CONFIRMATION_EVENT,
      }, context);
    } catch (error) {
      log_error(this.config.logger, this.config.relay_url, event.id, error, 'Error handling marketplace confirmation event');
    }
  }

  /**
   * Handle ATTENTION_PAYMENT_CONFIRMATION event (kind 38988)
   */
  private async handle_attention_payment_confirmation(event: Event): Promise<void> {
    try {
      const context: AttentionPaymentConfirmationEventContext = {
        event_id: event.id,
        pubkey: event.pubkey,
        payment_data: parse_content(event.content),
        event,
      };

      await emit_lifecycle_hooks(this.config.hooks, {
        before: HOOK_NAMES.BEFORE_ATTENTION_PAYMENT_CONFIRMATION_EVENT,
        on: HOOK_NAMES.ATTENTION_PAYMENT_CONFIRMATION_EVENT,
        after: HOOK_NAMES.AFTER_ATTENTION_PAYMENT_CONFIRMATION_EVENT,
      }, context);
    } catch (error) {
      log_error(this.config.logger, this.config.relay_url, event.id, error, 'Error handling attention payment confirmation event');
    }
  }

  /**
   * Handle MATCH event (kind 38888)
   */
  private async handle_match(event: Event): Promise<void> {
    try {
      const match_data = parse_content(event.content);

      // Emit MATCH_EVENT hook
      const match_context: MatchEventContext = {
        event_id: event.id,
        pubkey: event.pubkey,
        match_data,
        event,
      };

      await emit_lifecycle_hooks(this.config.hooks, {
        before: HOOK_NAMES.BEFORE_MATCH_EVENT,
        on: HOOK_NAMES.MATCH_EVENT,
        after: HOOK_NAMES.AFTER_MATCH_EVENT,
      }, match_context);

      // Emit MATCH_PUBLISHED hook (backward compatibility)
      const match_published_context: MatchPublishedContext = {
        match_event_id: event.id,
        match_data,
        event,
      };
      await this.config.hooks.emit(HOOK_NAMES.MATCH_PUBLISHED, match_published_context);
    } catch (error) {
      log_error(this.config.logger, this.config.relay_url, event.id, error, 'Error handling match event');
    }
  }

  /**
   * Handle NIP-51 List event (kind 30000)
   */
  private async handle_nip51_list(event: Event): Promise<void> {
    try {
      const context: Nip51ListEventContext = {
        event_id: event.id,
        pubkey: event.pubkey,
        list_data: parse_content(event.content),
        event,
      };

      await emit_lifecycle_hooks(this.config.hooks, {
        before: HOOK_NAMES.BEFORE_NIP51_LIST_EVENT,
        on: HOOK_NAMES.NIP51_LIST_EVENT,
        after: HOOK_NAMES.AFTER_NIP51_LIST_EVENT,
      }, context);
    } catch (error) {
      log_error(this.config.logger, this.config.relay_url, event.id, error, 'Error handling NIP-51 list event');
    }
  }
}
