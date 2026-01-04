/**
 * Generic ATTN Marketplace Server
 *
 * Standalone entry point for the @attn/ts-marketplace package.
 * Provides a working marketplace with in-memory storage for testing and development.
 *
 * For production use, implement your own entry point with persistent storage
 * (PostgreSQL, DynamoDB, etc.) by implementing the required hooks.
 *
 * @example
 * ```bash
 * # Run with environment variables
 * MARKETPLACE_PRIVATE_KEY=nsec1... \
 * NODE_PUBKEY=abc123... \
 * RELAY_READ_NOAUTH=wss://relay.example.com \
 * bun run src/server.ts
 * ```
 */

import { Marketplace } from './marketplace.ts';
import type {
  StoreBillboardContext,
  StorePromotionContext,
  StoreAttentionContext,
  StoreMatchContext,
  QueryPromotionsContext,
  FindMatchesContext,
  ExistsContext,
  AggregatesContext,
} from './types/hooks.ts';

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const config = {
  private_key: process.env.MARKETPLACE_PRIVATE_KEY || '',
  marketplace_id: process.env.MARKETPLACE_ID || 'generic-marketplace',
  name: process.env.MARKETPLACE_NAME || 'ATTN Marketplace',
  description: process.env.MARKETPLACE_DESCRIPTION || 'Generic ATTN Protocol marketplace with in-memory storage',
  node_pubkey: process.env.NODE_PUBKEY || '',
  min_duration: parseInt(process.env.MIN_DURATION || '15000', 10),
  max_duration: parseInt(process.env.MAX_DURATION || '60000', 10),
  match_fee_sats: parseInt(process.env.MATCH_FEE_SATS || '0', 10),
  confirmation_fee_sats: parseInt(process.env.CONFIRMATION_FEE_SATS || '0', 10),
  website_url: process.env.MARKETPLACE_WEBSITE_URL,
  auto_publish_marketplace: process.env.AUTO_PUBLISH_MARKETPLACE !== 'false',
  auto_match: process.env.AUTO_MATCH !== 'false',
  relay_config: {
    read_auth: (process.env.RELAY_READ_AUTH || '').split(',').filter(Boolean),
    read_noauth: (process.env.RELAY_READ_NOAUTH || '').split(',').filter(Boolean),
    write_auth: (process.env.RELAY_WRITE_AUTH || '').split(',').filter(Boolean),
    write_noauth: (process.env.RELAY_WRITE_NOAUTH || '').split(',').filter(Boolean),
  },
};

// Validate required configuration
if (!config.private_key) {
  console.error('ERROR: MARKETPLACE_PRIVATE_KEY is required');
  process.exit(1);
}

if (!config.node_pubkey) {
  console.error('ERROR: NODE_PUBKEY is required');
  process.exit(1);
}

const has_relays =
  config.relay_config.read_auth.length > 0 ||
  config.relay_config.read_noauth.length > 0 ||
  config.relay_config.write_auth.length > 0 ||
  config.relay_config.write_noauth.length > 0;

if (!has_relays) {
  console.error('ERROR: At least one relay URL is required (RELAY_READ_AUTH, RELAY_READ_NOAUTH, RELAY_WRITE_AUTH, or RELAY_WRITE_NOAUTH)');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════
// IN-MEMORY STORAGE
// ═══════════════════════════════════════════════════════════════

interface StoredEvent<T> {
  event: import('nostr-tools').Event;
  data: T;
  block_height: number;
  d_tag: string;
  coordinate: string;
}

const storage = {
  billboards: new Map<string, StoredEvent<import('@attn/ts-core').BillboardData>>(),
  promotions: new Map<string, StoredEvent<import('@attn/ts-core').PromotionData>>(),
  attention: new Map<string, StoredEvent<import('@attn/ts-core').AttentionData>>(),
  matches: new Map<string, StoredEvent<import('@attn/ts-core').MatchData>>(),
};

// ═══════════════════════════════════════════════════════════════
// MARKETPLACE INSTANCE
// ═══════════════════════════════════════════════════════════════

const marketplace = new Marketplace(config);

// ═══════════════════════════════════════════════════════════════
// REQUIRED HOOKS - Storage
// ═══════════════════════════════════════════════════════════════

marketplace.on_store_billboard(async (ctx: StoreBillboardContext) => {
  storage.billboards.set(ctx.event.id, {
    event: ctx.event,
    data: ctx.data,
    block_height: ctx.block_height,
    d_tag: ctx.d_tag,
    coordinate: ctx.coordinate,
  });
  console.log(`[BILLBOARD] Stored: ${ctx.event.id.substring(0, 8)}... (block ${ctx.block_height})`);
});

marketplace.on_store_promotion(async (ctx: StorePromotionContext) => {
  storage.promotions.set(ctx.event.id, {
    event: ctx.event,
    data: ctx.data,
    block_height: ctx.block_height,
    d_tag: ctx.d_tag,
    coordinate: ctx.coordinate,
  });
  console.log(`[PROMOTION] Stored: ${ctx.event.id.substring(0, 8)}... bid=${ctx.data.bid} sats (block ${ctx.block_height})`);
});

marketplace.on_store_attention(async (ctx: StoreAttentionContext) => {
  storage.attention.set(ctx.event.id, {
    event: ctx.event,
    data: ctx.data,
    block_height: ctx.block_height,
    d_tag: ctx.d_tag,
    coordinate: ctx.coordinate,
  });
  console.log(`[ATTENTION] Stored: ${ctx.event.id.substring(0, 8)}... ask=${ctx.data.ask} sats (block ${ctx.block_height})`);
});

marketplace.on_store_match(async (ctx: StoreMatchContext) => {
  storage.matches.set(ctx.event.id, {
    event: ctx.event,
    data: ctx.data,
    block_height: ctx.block_height,
    d_tag: ctx.d_tag,
    coordinate: ctx.coordinate,
  });
  console.log(`[MATCH] Stored: ${ctx.event.id.substring(0, 8)}... (block ${ctx.block_height})`);
});

// ═══════════════════════════════════════════════════════════════
// REQUIRED HOOKS - Query & Matching
// ═══════════════════════════════════════════════════════════════

marketplace.on_query_promotions(async (ctx: QueryPromotionsContext) => {
  const promotions = [...storage.promotions.values()]
    .filter((p) => {
      // Filter by marketplace coordinate
      const promo_marketplace = p.event.tags.find(
        (t) => t[0] === 'a' && t[1]?.startsWith('38188:')
      )?.[1];
      if (promo_marketplace !== ctx.marketplace_coordinate) {
        return false;
      }
      // Filter by bid (must meet minimum)
      if (ctx.min_bid !== undefined && p.data.bid < ctx.min_bid) {
        return false;
      }
      // Filter by duration
      if (ctx.min_duration !== undefined && p.data.duration < ctx.min_duration) {
        return false;
      }
      if (ctx.max_duration !== undefined && p.data.duration > ctx.max_duration) {
        return false;
      }
      return true;
    });

  return { promotions };
});

marketplace.on_find_matches(async (ctx: FindMatchesContext) => {
  // Simple matching: return all candidates
  // In production, you might implement priority/sorting logic
  return { matches: ctx.candidates };
});

marketplace.on_exists(async (ctx: ExistsContext) => {
  let exists = false;
  switch (ctx.event_type) {
    case 'billboard':
      exists = storage.billboards.has(ctx.event_id);
      break;
    case 'promotion':
      exists = storage.promotions.has(ctx.event_id);
      break;
    case 'attention':
      exists = storage.attention.has(ctx.event_id);
      break;
    case 'match':
      exists = storage.matches.has(ctx.event_id);
      break;
  }
  return { exists };
});

marketplace.on_get_aggregates(async (_ctx: AggregatesContext) => {
  return {
    billboard_count: storage.billboards.size,
    promotion_count: storage.promotions.size,
    attention_count: storage.attention.size,
    match_count: storage.matches.size,
  };
});

// ═══════════════════════════════════════════════════════════════
// OPTIONAL HOOKS - Logging
// ═══════════════════════════════════════════════════════════════

marketplace.on_block_boundary(async (ctx) => {
  console.log(`[BLOCK] New block: ${ctx.block_height}${ctx.block_hash ? ` (${ctx.block_hash.substring(0, 8)}...)` : ''}`);
  console.log(`[STATS] Billboards: ${storage.billboards.size}, Promotions: ${storage.promotions.size}, Attention: ${storage.attention.size}, Matches: ${storage.matches.size}`);
});

marketplace.on_after_publish_match(async (ctx) => {
  const success_count = ctx.publish_results.filter((r) => r.success).length;
  console.log(`[MATCH] Published to ${success_count}/${ctx.publish_results.length} relays`);
});

marketplace.on_after_publish_marketplace(async (ctx) => {
  const success_count = ctx.publish_results.filter((r) => r.success).length;
  console.log(`[MARKETPLACE] Published to ${success_count}/${ctx.publish_results.length} relays`);
});

// Framework-level hooks
marketplace.attn.on_relay_connect(async (ctx) => {
  console.log(`[RELAY] Connected: ${ctx.relay_url}`);
});

marketplace.attn.on_relay_disconnect(async (ctx) => {
  console.log(`[RELAY] Disconnected: ${ctx.relay_url} (${ctx.reason || 'unknown'})`);
});

// ═══════════════════════════════════════════════════════════════
// STARTUP
// ═══════════════════════════════════════════════════════════════

async function main() {
  console.log('════════════════════════════════════════════════════════════');
  console.log('  ATTN Protocol Marketplace (Generic)');
  console.log('════════════════════════════════════════════════════════════');
  console.log(`  ID:          ${config.marketplace_id}`);
  console.log(`  Name:        ${config.name}`);
  console.log(`  Node Pubkey: ${config.node_pubkey.substring(0, 16)}...`);
  console.log(`  Duration:    ${config.min_duration}ms - ${config.max_duration}ms`);
  console.log(`  Match Fee:   ${config.match_fee_sats} sats`);
  console.log(`  Storage:     In-memory (non-persistent)`);
  console.log('════════════════════════════════════════════════════════════');
  console.log('');

  try {
    await marketplace.start();
    console.log('[STARTUP] Marketplace started successfully');
    console.log('[STARTUP] Listening for ATTN Protocol events...');
  } catch (error) {
    console.error('[STARTUP] Failed to start marketplace:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n[SHUTDOWN] Received SIGINT, shutting down...');
  await marketplace.stop();
  console.log('[SHUTDOWN] Marketplace stopped');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n[SHUTDOWN] Received SIGTERM, shutting down...');
  await marketplace.stop();
  console.log('[SHUTDOWN] Marketplace stopped');
  process.exit(0);
});

// Start the marketplace
main().catch((error) => {
  console.error('[FATAL]', error);
  process.exit(1);
});
