import { describe, it, expect } from 'vitest';
import {
  block_data_schema,
  marketplace_data_schema,
  billboard_data_schema,
  promotion_data_schema,
  attention_data_schema,
  match_data_schema,
  billboard_confirmation_data_schema,
  attention_confirmation_data_schema,
  marketplace_confirmation_data_schema,
  attention_payment_confirmation_data_schema,
} from './validation.js';

// Test fixtures
const valid_pubkey = 'a'.repeat(64);
const valid_event_id = 'b'.repeat(64);
const valid_block_hash = 'c'.repeat(64);

describe('block_data_schema', () => {
  it('should validate valid block data', () => {
    const valid_data = {
      height: 862626,
      hash: valid_block_hash,
      time: 1234567890,
      difficulty: '97345261772782.69',
      tx_count: 2345,
      size: 1000000,
      weight: 2000000,
      version: 1,
      merkle_root: 'd'.repeat(64),
      nonce: 123456,
      ref_node_pubkey: valid_pubkey,
      ref_block_id: 'org.attnprotocol:block:862626:abc123',
    };
    expect(() => block_data_schema.parse(valid_data)).not.toThrow();
  });

  it('should validate block data with only required fields', () => {
    const minimal_data = {
      height: 862626,
      hash: valid_block_hash,
    };
    expect(() => block_data_schema.parse(minimal_data)).not.toThrow();
  });

  it('should reject invalid height (negative)', () => {
    const invalid_data = {
      height: -1,
      hash: valid_block_hash,
    };
    expect(() => block_data_schema.parse(invalid_data)).toThrow();
  });

  it('should reject invalid height (zero)', () => {
    const invalid_data = {
      height: 0,
      hash: valid_block_hash,
    };
    expect(() => block_data_schema.parse(invalid_data)).toThrow();
  });

  it('should reject invalid hash (non-hex)', () => {
    const invalid_data = {
      height: 862626,
      hash: 'invalid-hash!',
    };
    expect(() => block_data_schema.parse(invalid_data)).toThrow();
  });

  it('should reject invalid pubkey (wrong length)', () => {
    const invalid_data = {
      height: 862626,
      hash: valid_block_hash,
      ref_node_pubkey: 'short',
    };
    expect(() => block_data_schema.parse(invalid_data)).toThrow();
  });
});

describe('marketplace_data_schema', () => {
  it('should validate valid marketplace data', () => {
    const valid_data = {
      name: 'Test Marketplace',
      description: 'A test marketplace',
      admin_pubkey: valid_pubkey,
      min_duration: 1000,
      max_duration: 10000,
      match_fee_sats: 100,
      confirmation_fee_sats: 50,
      ref_marketplace_pubkey: valid_pubkey,
      ref_marketplace_id: 'org.attnprotocol:marketplace:test',
      ref_node_pubkey: valid_pubkey,
      ref_block_id: 'org.attnprotocol:block:862626:abc123',
      billboard_count: 10,
      promotion_count: 100,
      attention_count: 50,
      match_count: 25,
    };
    expect(() => marketplace_data_schema.parse(valid_data)).not.toThrow();
  });

  it('should validate empty marketplace data', () => {
    expect(() => marketplace_data_schema.parse({})).not.toThrow();
  });

  it('should reject negative match_fee_sats', () => {
    const invalid_data = {
      match_fee_sats: -1,
    };
    expect(() => marketplace_data_schema.parse(invalid_data)).toThrow();
  });

  it('should accept zero match_fee_sats', () => {
    const valid_data = {
      match_fee_sats: 0,
    };
    expect(() => marketplace_data_schema.parse(valid_data)).not.toThrow();
  });

  it('should accept zero for counts', () => {
    const valid_data = {
      billboard_count: 0,
      promotion_count: 0,
      attention_count: 0,
      match_count: 0,
    };
    expect(() => marketplace_data_schema.parse(valid_data)).not.toThrow();
  });
});

describe('billboard_data_schema', () => {
  it('should validate valid billboard data', () => {
    const valid_data = {
      name: 'Test Billboard',
      description: 'A test billboard',
      confirmation_fee_sats: 25,
      ref_billboard_pubkey: valid_pubkey,
      ref_billboard_id: 'org.attnprotocol:billboard:test',
      ref_marketplace_pubkey: valid_pubkey,
      ref_marketplace_id: 'org.attnprotocol:marketplace:test',
    };
    expect(() => billboard_data_schema.parse(valid_data)).not.toThrow();
  });

  it('should validate empty billboard data', () => {
    expect(() => billboard_data_schema.parse({})).not.toThrow();
  });

  it('should reject negative confirmation_fee_sats', () => {
    const invalid_data = {
      confirmation_fee_sats: -1,
    };
    expect(() => billboard_data_schema.parse(invalid_data)).toThrow();
  });

  it('should accept zero confirmation_fee_sats', () => {
    const valid_data = {
      confirmation_fee_sats: 0,
    };
    expect(() => billboard_data_schema.parse(valid_data)).not.toThrow();
  });
});

describe('promotion_data_schema', () => {
  it('should validate valid promotion data', () => {
    const valid_data = {
      duration: 5000,
      bid: 1000,
      event_id: valid_event_id,
      call_to_action: 'Click here',
      call_to_action_url: 'https://example.com',
      escrow_id_list: ['escrow1', 'escrow2'],
      ref_promotion_pubkey: valid_pubkey,
      ref_promotion_id: 'org.attnprotocol:promotion:test',
      ref_marketplace_pubkey: valid_pubkey,
      ref_marketplace_id: 'org.attnprotocol:marketplace:test',
      ref_billboard_pubkey: valid_pubkey,
      ref_billboard_id: 'org.attnprotocol:billboard:test',
    };
    expect(() => promotion_data_schema.parse(valid_data)).not.toThrow();
  });

  it('should validate empty promotion data', () => {
    expect(() => promotion_data_schema.parse({})).not.toThrow();
  });

  it('should reject invalid event_id (wrong length)', () => {
    const invalid_data = {
      event_id: 'short',
    };
    expect(() => promotion_data_schema.parse(invalid_data)).toThrow();
  });

  it('should reject invalid URL', () => {
    const invalid_data = {
      call_to_action_url: 'not-a-url',
    };
    expect(() => promotion_data_schema.parse(invalid_data)).toThrow();
  });

  it('should accept valid URL', () => {
    const valid_data = {
      call_to_action_url: 'https://example.com/path',
    };
    expect(() => promotion_data_schema.parse(valid_data)).not.toThrow();
  });

  it('should reject negative bid', () => {
    const invalid_data = {
      bid: -1,
    };
    expect(() => promotion_data_schema.parse(invalid_data)).toThrow();
  });
});

describe('attention_data_schema', () => {
  it('should validate valid attention data', () => {
    const valid_data = {
      ask: 500,
      min_duration: 1000,
      max_duration: 10000,
      blocked_promotions_id: 'org.attnprotocol:list:blocked',
      blocked_promoters_id: 'org.attnprotocol:list:blocked',
      trusted_marketplaces_id: 'org.attnprotocol:list:trusted',
      trusted_billboards_id: 'org.attnprotocol:list:trusted',
      ref_attention_pubkey: valid_pubkey,
      ref_attention_id: 'org.attnprotocol:attention:test',
      ref_marketplace_pubkey: valid_pubkey,
      ref_marketplace_id: 'org.attnprotocol:marketplace:test',
    };
    expect(() => attention_data_schema.parse(valid_data)).not.toThrow();
  });

  it('should validate empty attention data', () => {
    expect(() => attention_data_schema.parse({})).not.toThrow();
  });

  it('should reject negative ask', () => {
    const invalid_data = {
      ask: -1,
    };
    expect(() => attention_data_schema.parse(invalid_data)).toThrow();
  });

  it('should reject zero ask', () => {
    const invalid_data = {
      ask: 0,
    };
    expect(() => attention_data_schema.parse(invalid_data)).toThrow();
  });
});

describe('match_data_schema', () => {
  it('should validate valid match data', () => {
    const valid_data = {
      ref_match_id: 'org.attnprotocol:match:test',
      ref_marketplace_id: 'org.attnprotocol:marketplace:test',
      ref_billboard_id: 'org.attnprotocol:billboard:test',
      ref_promotion_id: 'org.attnprotocol:promotion:test',
      ref_attention_id: 'org.attnprotocol:attention:test',
      ref_marketplace_pubkey: valid_pubkey,
      ref_promotion_pubkey: valid_pubkey,
      ref_attention_pubkey: valid_pubkey,
      ref_billboard_pubkey: valid_pubkey,
    };
    expect(() => match_data_schema.parse(valid_data)).not.toThrow();
  });

  it('should validate empty match data', () => {
    expect(() => match_data_schema.parse({})).not.toThrow();
  });

  it('should reject invalid pubkey', () => {
    const invalid_data = {
      ref_marketplace_pubkey: 'invalid',
    };
    expect(() => match_data_schema.parse(invalid_data)).toThrow();
  });
});

describe('billboard_confirmation_data_schema', () => {
  it('should validate valid billboard confirmation data', () => {
    const valid_data = {
      ref_match_event_id: valid_event_id,
      ref_match_id: 'org.attnprotocol:match:test',
      ref_marketplace_pubkey: valid_pubkey,
      ref_billboard_pubkey: valid_pubkey,
      ref_promotion_pubkey: valid_pubkey,
      ref_attention_pubkey: valid_pubkey,
      ref_marketplace_id: 'org.attnprotocol:marketplace:test',
      ref_billboard_id: 'org.attnprotocol:billboard:test',
      ref_promotion_id: 'org.attnprotocol:promotion:test',
      ref_attention_id: 'org.attnprotocol:attention:test',
    };
    expect(() => billboard_confirmation_data_schema.parse(valid_data)).not.toThrow();
  });

  it('should validate empty billboard confirmation data', () => {
    expect(() => billboard_confirmation_data_schema.parse({})).not.toThrow();
  });

  it('should reject invalid event_id', () => {
    const invalid_data = {
      ref_match_event_id: 'invalid',
    };
    expect(() => billboard_confirmation_data_schema.parse(invalid_data)).toThrow();
  });
});

describe('attention_confirmation_data_schema', () => {
  it('should validate valid attention confirmation data', () => {
    const valid_data = {
      ref_match_event_id: valid_event_id,
      ref_match_id: 'org.attnprotocol:match:test',
      ref_marketplace_pubkey: valid_pubkey,
      ref_billboard_pubkey: valid_pubkey,
      ref_promotion_pubkey: valid_pubkey,
      ref_attention_pubkey: valid_pubkey,
      ref_marketplace_id: 'org.attnprotocol:marketplace:test',
      ref_billboard_id: 'org.attnprotocol:billboard:test',
      ref_promotion_id: 'org.attnprotocol:promotion:test',
      ref_attention_id: 'org.attnprotocol:attention:test',
    };
    expect(() => attention_confirmation_data_schema.parse(valid_data)).not.toThrow();
  });

  it('should validate empty attention confirmation data', () => {
    expect(() => attention_confirmation_data_schema.parse({})).not.toThrow();
  });
});

describe('marketplace_confirmation_data_schema', () => {
  it('should validate valid marketplace confirmation data', () => {
    const valid_data = {
      ref_match_event_id: valid_event_id,
      ref_match_id: 'org.attnprotocol:match:test',
      ref_billboard_confirmation_event_id: valid_event_id,
      ref_attention_confirmation_event_id: valid_event_id,
      ref_marketplace_pubkey: valid_pubkey,
      ref_billboard_pubkey: valid_pubkey,
      ref_promotion_pubkey: valid_pubkey,
      ref_attention_pubkey: valid_pubkey,
      ref_marketplace_id: 'org.attnprotocol:marketplace:test',
      ref_billboard_id: 'org.attnprotocol:billboard:test',
      ref_promotion_id: 'org.attnprotocol:promotion:test',
      ref_attention_id: 'org.attnprotocol:attention:test',
    };
    expect(() => marketplace_confirmation_data_schema.parse(valid_data)).not.toThrow();
  });

  it('should validate empty marketplace confirmation data', () => {
    expect(() => marketplace_confirmation_data_schema.parse({})).not.toThrow();
  });
});

describe('attention_payment_confirmation_data_schema', () => {
  it('should validate valid attention payment confirmation data', () => {
    const valid_data = {
      sats_received: 1000,
      payment_proof: 'proof-string',
      ref_match_event_id: valid_event_id,
      ref_match_id: 'org.attnprotocol:match:test',
      ref_marketplace_confirmation_event_id: valid_event_id,
      ref_marketplace_pubkey: valid_pubkey,
      ref_billboard_pubkey: valid_pubkey,
      ref_promotion_pubkey: valid_pubkey,
      ref_attention_pubkey: valid_pubkey,
      ref_marketplace_id: 'org.attnprotocol:marketplace:test',
      ref_billboard_id: 'org.attnprotocol:billboard:test',
      ref_promotion_id: 'org.attnprotocol:promotion:test',
      ref_attention_id: 'org.attnprotocol:attention:test',
    };
    expect(() => attention_payment_confirmation_data_schema.parse(valid_data)).not.toThrow();
  });

  it('should validate empty attention payment confirmation data', () => {
    expect(() => attention_payment_confirmation_data_schema.parse({})).not.toThrow();
  });

  it('should reject negative sats_received', () => {
    const invalid_data = {
      sats_received: -1,
    };
    expect(() => attention_payment_confirmation_data_schema.parse(invalid_data)).toThrow();
  });

  it('should reject zero sats_received', () => {
    const invalid_data = {
      sats_received: 0,
    };
    expect(() => attention_payment_confirmation_data_schema.parse(invalid_data)).toThrow();
  });
});
