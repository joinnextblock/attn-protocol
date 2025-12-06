/**
 * Test fixtures for Nostr events
 */

import type { Event } from 'nostr-tools';
import { ATTN_EVENT_KINDS } from '@attn-protocol/core';

export function create_mock_block_event(
  block_height: number = 850000,
  pubkey: string = 'a'.repeat(64)
): Event {
  return {
    id: 'block_event_id_' + block_height,
    pubkey,
    created_at: Math.floor(Date.now() / 1000),
    kind: ATTN_EVENT_KINDS.BLOCK,
    tags: [
      ['t', block_height.toString()],
      ['h', block_height.toString()],
    ],
    content: JSON.stringify({
      height: block_height,
      hash: 'block_hash_' + block_height,
      timestamp: Math.floor(Date.now() / 1000),
    }),
    sig: 'sig'.repeat(64),
  };
}

export function create_mock_marketplace_event(
  marketplace_id: string = 'marketplace_1',
  pubkey: string = 'b'.repeat(64)
): Event {
  return {
    id: 'marketplace_event_id',
    pubkey,
    created_at: Math.floor(Date.now() / 1000),
    kind: ATTN_EVENT_KINDS.MARKETPLACE,
    tags: [
      ['d', 'org.attnprotocol:marketplace:' + marketplace_id],
      ['t', '850000'],
    ],
    content: JSON.stringify({
      name: 'Test Marketplace',
      marketplace_id,
    }),
    sig: 'sig'.repeat(64),
  };
}

export function create_mock_billboard_event(
  billboard_id: string = 'billboard_1',
  pubkey: string = 'c'.repeat(64)
): Event {
  return {
    id: 'billboard_event_id',
    pubkey,
    created_at: Math.floor(Date.now() / 1000),
    kind: ATTN_EVENT_KINDS.BILLBOARD,
    tags: [
      ['d', 'org.attnprotocol:billboard:' + billboard_id],
      ['t', '850000'],
    ],
    content: JSON.stringify({
      name: 'Test Billboard',
      billboard_id,
    }),
    sig: 'sig'.repeat(64),
  };
}

export function create_mock_nostr_message(type: string, ...args: unknown[]): string {
  return JSON.stringify([type, ...args]);
}

export function create_mock_auth_challenge(challenge: string = 'test_challenge'): string {
  return create_mock_nostr_message('AUTH', challenge);
}

export function create_mock_auth_response(event_id: string = 'auth_event_id'): string {
  return create_mock_nostr_message('OK', event_id, true, '');
}

export function create_mock_event_response(event_id: string = 'event_id', ok: boolean = true, message: string = ''): string {
  return create_mock_nostr_message('OK', event_id, ok, message);
}

export function create_mock_eose(subscription_id: string = 'sub_1'): string {
  return create_mock_nostr_message('EOSE', subscription_id);
}

export function create_mock_event_message(subscription_id: string, event: Event): string {
  return create_mock_nostr_message('EVENT', subscription_id, event);
}

