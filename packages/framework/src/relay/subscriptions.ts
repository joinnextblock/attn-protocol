/**
 * Subscription management for Nostr relay connections
 * Handles creating, tracking, and closing subscriptions
 */

import { ATTN_EVENT_KINDS, NIP51_LIST_TYPES, CITY_PROTOCOL_KINDS } from '@attn/ts-core';
import { HookEmitter } from '../hooks/emitter.js';
import { HOOK_NAMES } from '../hooks/index.js';
import type { Logger } from '../logger.js';
import type { SubscriptionContext } from '../hooks/types.js';
import type { WebSocketWithOn } from './websocket.js';
import { WS_READY_STATE } from './websocket.js';

/**
 * Subscription filter types
 */
export interface SubscriptionFilter {
  kinds: number[];
  authors?: string[];
  since?: number;
  '#p'?: string[];
  '#d'?: string[];
  [key: string]: unknown;
}

/**
 * Subscription configuration
 */
export interface SubscriptionConfig {
  relay_url: string;
  node_pubkeys?: string[];
  marketplace_pubkeys?: string[];
  marketplace_d_tags?: string[];
  billboard_pubkeys?: string[];
  advertiser_pubkeys?: string[];
  subscription_since?: number;
  logger: Logger;
  hooks: HookEmitter;
}

/**
 * Subscription manager - handles all relay subscriptions
 */
export class SubscriptionManager {
  private config: SubscriptionConfig;
  private block_subscription_id: string;
  private attn_subscription_id: string;
  private attn_subscription_ids: string[] = [];
  private attn_filter_map: Map<string, SubscriptionFilter> = new Map();
  private standard_subscription_id: string;
  private nip51_subscription_id: string;

  constructor(config: SubscriptionConfig) {
    this.config = config;
    const timestamp = Date.now();
    this.block_subscription_id = `attn-blocks-${timestamp}`;
    this.attn_subscription_id = `attn-events-${timestamp}`;
    this.standard_subscription_id = `attn-standard-${timestamp}`;
    this.nip51_subscription_id = `${this.standard_subscription_id}-nip51`;
  }

  /**
   * Get all subscription IDs for checking incoming messages
   */
  get subscription_ids(): {
    block: string;
    attn: string[];
    standard: string;
    nip51: string;
  } {
    return {
      block: this.block_subscription_id,
      attn: this.attn_subscription_ids,
      standard: this.standard_subscription_id,
      nip51: this.nip51_subscription_id,
    };
  }

  /**
   * Check if subscription ID belongs to ATTN events
   */
  is_attn_subscription(subscription_id: string): boolean {
    return this.attn_subscription_ids.includes(subscription_id);
  }

  /**
   * Get filter for a subscription (for EOSE handling)
   */
  get_filter(subscription_id: string): SubscriptionFilter | undefined {
    return this.attn_filter_map.get(subscription_id);
  }

  /**
   * Subscribe to all events on the relay
   * @param ws - WebSocket connection to send subscriptions on
   */
  subscribe_all(ws: WebSocketWithOn): void {
    if (!ws || ws.readyState !== WS_READY_STATE.OPEN) {
      this.config.logger.warn(
        { relay_url: this.config.relay_url, ready_state: ws?.readyState },
        'Cannot subscribe: WebSocket not open'
      );
      return;
    }

    const since_filter = this.config.subscription_since;
    if (since_filter) {
      this.config.logger.debug(
        {
          relay_url: this.config.relay_url,
          since: since_filter,
          since_date: new Date(since_filter * 1000).toISOString(),
        },
        'Using since filter for subscriptions'
      );
    }

    this.subscribe_to_block_events(ws, since_filter);
    this.subscribe_to_attn_events(ws, since_filter);
    this.subscribe_to_standard_events(ws);
    this.subscribe_to_nip51_lists(ws);
  }

  /**
   * Close all subscriptions
   * @param ws - WebSocket connection to send CLOSE messages on
   */
  close_all(ws: WebSocketWithOn): void {
    if (!ws || ws.readyState !== WS_READY_STATE.OPEN) {
      return;
    }

    // Close block subscription
    ws.send(JSON.stringify(['CLOSE', this.block_subscription_id]));

    // Close ATTN subscriptions
    for (const attn_id of this.attn_subscription_ids) {
      ws.send(JSON.stringify(['CLOSE', attn_id]));
    }
    this.attn_subscription_ids = [];
    this.attn_filter_map.clear();

    // Close standard subscriptions
    ws.send(JSON.stringify(['CLOSE', this.standard_subscription_id]));
    ws.send(JSON.stringify(['CLOSE', this.nip51_subscription_id]));
  }

  /**
   * Emit subscription confirmed hook (for EOSE handling)
   */
  async emit_subscription_confirmed(subscription_id: string): Promise<void> {
    let filter: SubscriptionFilter;

    if (subscription_id === this.block_subscription_id) {
      filter = { kinds: [CITY_PROTOCOL_KINDS.BLOCK] };
      if (this.config.node_pubkeys?.length) {
        filter.authors = this.config.node_pubkeys;
      }
    } else if (this.is_attn_subscription(subscription_id)) {
      filter = this.get_filter(subscription_id) ?? { kinds: [] };
    } else if (subscription_id === this.standard_subscription_id) {
      filter = { kinds: [0, 10002] };
    } else if (subscription_id === this.nip51_subscription_id) {
      filter = {
        kinds: [30000],
        '#d': [
          NIP51_LIST_TYPES.BLOCKED_PROMOTIONS,
          NIP51_LIST_TYPES.BLOCKED_PROMOTERS,
          NIP51_LIST_TYPES.TRUSTED_BILLBOARDS,
          NIP51_LIST_TYPES.TRUSTED_MARKETPLACES,
        ],
      };
    } else {
      return; // Unknown subscription
    }

    const context: SubscriptionContext = {
      relay_url: this.config.relay_url,
      subscription_id,
      filter,
      status: 'confirmed',
    };

    await this.config.hooks.emit(HOOK_NAMES.SUBSCRIPTION, context).catch(() => {
      // Ignore errors in hook handlers
    });
  }

  /**
   * Subscribe to block events (kind 38808 from City Protocol)
   */
  private subscribe_to_block_events(ws: WebSocketWithOn, since_filter?: number): void {
    const filter: SubscriptionFilter = {
      kinds: [CITY_PROTOCOL_KINDS.BLOCK],
    };

    if (this.config.node_pubkeys?.length) {
      filter.authors = this.config.node_pubkeys;
    }

    if (since_filter) {
      filter.since = since_filter;
    }

    const req_message = JSON.stringify(['REQ', this.block_subscription_id, filter]);
    this.config.logger.debug(
      { relay_url: this.config.relay_url, subscription_id: this.block_subscription_id, filter },
      'Sending REQ subscription for block events'
    );
    ws.send(req_message);

    this.emit_subscription_hook(this.block_subscription_id, filter, 'subscribed');
  }

  /**
   * Subscribe to ATTN Protocol events
   */
  private subscribe_to_attn_events(ws: WebSocketWithOn, since_filter?: number): void {
    const filter: SubscriptionFilter = {
      kinds: [
        ATTN_EVENT_KINDS.MARKETPLACE,
        ATTN_EVENT_KINDS.BILLBOARD,
        ATTN_EVENT_KINDS.PROMOTION,
        ATTN_EVENT_KINDS.ATTENTION,
        ATTN_EVENT_KINDS.BILLBOARD_CONFIRMATION,
        ATTN_EVENT_KINDS.ATTENTION_CONFIRMATION,
        ATTN_EVENT_KINDS.MARKETPLACE_CONFIRMATION,
        ATTN_EVENT_KINDS.ATTENTION_PAYMENT_CONFIRMATION,
        ATTN_EVENT_KINDS.MATCH,
      ],
    };

    if (since_filter) {
      filter.since = since_filter;
    }

    // Combine all pubkey filters
    const all_pubkeys: string[] = [];
    if (this.config.marketplace_pubkeys?.length) {
      all_pubkeys.push(...this.config.marketplace_pubkeys);
    }
    if (this.config.billboard_pubkeys?.length) {
      all_pubkeys.push(...this.config.billboard_pubkeys);
    }
    if (this.config.advertiser_pubkeys?.length) {
      all_pubkeys.push(...this.config.advertiser_pubkeys);
    }

    if (all_pubkeys.length > 0) {
      const unique_pubkeys = Array.from(new Set(all_pubkeys));
      filter['#p'] = unique_pubkeys;
    }

    // Add d-tag filter for marketplace events if specified
    if (this.config.marketplace_d_tags?.length) {
      filter['#d'] = this.config.marketplace_d_tags;
    }

    this.attn_subscription_ids = [this.attn_subscription_id];
    this.attn_filter_map.set(this.attn_subscription_id, filter);

    const req_message = JSON.stringify(['REQ', this.attn_subscription_id, filter]);
    this.config.logger.debug(
      { relay_url: this.config.relay_url, subscription_id: this.attn_subscription_id, filter },
      'Sending REQ subscription for ATTN Protocol events'
    );
    ws.send(req_message);

    this.emit_subscription_hook(this.attn_subscription_id, filter, 'subscribed');
  }

  /**
   * Subscribe to standard Nostr events (profiles, relay lists)
   */
  private subscribe_to_standard_events(ws: WebSocketWithOn): void {
    const filter: SubscriptionFilter = {
      kinds: [0, 10002],
    };

    const req_message = JSON.stringify(['REQ', this.standard_subscription_id, filter]);
    this.config.logger.debug(
      { relay_url: this.config.relay_url, subscription_id: this.standard_subscription_id, filter },
      'Sending REQ subscription for standard Nostr events'
    );
    ws.send(req_message);

    this.emit_subscription_hook(this.standard_subscription_id, filter, 'subscribed');
  }

  /**
   * Subscribe to NIP-51 lists
   */
  private subscribe_to_nip51_lists(ws: WebSocketWithOn): void {
    const filter: SubscriptionFilter = {
      kinds: [30000],
      '#d': [
        NIP51_LIST_TYPES.BLOCKED_PROMOTIONS,
        NIP51_LIST_TYPES.BLOCKED_PROMOTERS,
        NIP51_LIST_TYPES.TRUSTED_BILLBOARDS,
        NIP51_LIST_TYPES.TRUSTED_MARKETPLACES,
      ],
    };

    const req_message = JSON.stringify(['REQ', this.nip51_subscription_id, filter]);
    this.config.logger.debug(
      { relay_url: this.config.relay_url, subscription_id: this.nip51_subscription_id, filter },
      'Sending REQ subscription for NIP-51 lists'
    );
    ws.send(req_message);

    this.emit_subscription_hook(this.nip51_subscription_id, filter, 'subscribed');
  }

  /**
   * Emit subscription hook
   */
  private emit_subscription_hook(
    subscription_id: string,
    filter: SubscriptionFilter,
    status: 'subscribed' | 'confirmed'
  ): void {
    const context: SubscriptionContext = {
      relay_url: this.config.relay_url,
      subscription_id,
      filter,
      status,
    };

    this.config.hooks.emit(HOOK_NAMES.SUBSCRIPTION, context).catch(() => {
      // Ignore errors in hook handlers
    });
  }
}
