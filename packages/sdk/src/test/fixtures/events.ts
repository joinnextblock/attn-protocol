/**
 * Test fixtures for SDK event testing
 */

import type { Event } from 'nostr-tools';
import { ATTN_EVENT_KINDS, CITY_PROTOCOL_KINDS } from '@attn/ts-core';

export function create_mock_event(
  kind: number,
  content: Record<string, unknown>,
  tags: string[][] = [],
  pubkey: string = 'a'.repeat(64)
): Event {
  return {
    id: 'event_id_' + Math.random().toString(36).substring(7),
    pubkey,
    created_at: Math.floor(Date.now() / 1000),
    kind,
    tags,
    content: JSON.stringify(content),
    sig: 'sig'.repeat(64),
  };
}

export function create_mock_block_event(block_height: number = 850000): Event {
  return create_mock_event(
    CITY_PROTOCOL_KINDS.BLOCK,
    {
      height: block_height,
      hash: 'block_hash_' + block_height,
    },
    [['t', block_height.toString()]]
  );
}

export function create_mock_marketplace_event(marketplace_id: string = 'marketplace_1'): Event {
  return create_mock_event(
    ATTN_EVENT_KINDS.MARKETPLACE,
    {
      name: 'Test Marketplace',
      marketplace_id,
    },
    [
      ['d', 'org.attnprotocol:marketplace:' + marketplace_id],
      ['t', '850000'],
    ]
  );
}

export function create_mock_billboard_event(billboard_id: string = 'billboard_1'): Event {
  return create_mock_event(
    ATTN_EVENT_KINDS.BILLBOARD,
    {
      name: 'Test Billboard',
      billboard_id,
    },
    [
      ['d', 'org.attnprotocol:billboard:' + billboard_id],
      ['t', '850000'],
    ]
  );
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

