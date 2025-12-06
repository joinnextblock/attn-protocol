import { describe, it, expect } from 'vitest';
import type { Event } from 'nostr-tools';
import {
  get_tag_value,
  get_tag_values,
  get_tag_value_by_prefix,
  validate_block_height,
  validate_sats_per_second,
  validate_json_content,
  validate_d_tag_prefix,
  validate_a_tag_reference,
  validate_pubkey,
} from './validation.js';

describe('get_tag_value', () => {
  it('should return tag value when tag exists', () => {
    const event: Event = {
      id: 'event_id',
      pubkey: 'pubkey',
      created_at: 1234567890,
      kind: 1,
      tags: [['d', 'test_value'], ['t', '850000']],
      content: '',
      sig: 'sig',
    };

    expect(get_tag_value(event, 'd')).toBe('test_value');
    expect(get_tag_value(event, 't')).toBe('850000');
  });

  it('should return empty string when tag does not exist', () => {
    const event: Event = {
      id: 'event_id',
      pubkey: 'pubkey',
      created_at: 1234567890,
      kind: 1,
      tags: [],
      content: '',
      sig: 'sig',
    };

    expect(get_tag_value(event, 'd')).toBe('');
  });

  it('should return empty string when tag value is missing', () => {
    const event: Event = {
      id: 'event_id',
      pubkey: 'pubkey',
      created_at: 1234567890,
      kind: 1,
      tags: [['d']],
      content: '',
      sig: 'sig',
    };

    expect(get_tag_value(event, 'd')).toBe('');
  });
});

describe('get_tag_values', () => {
  it('should return all tag values for a given tag name', () => {
    const event: Event = {
      id: 'event_id',
      pubkey: 'pubkey',
      created_at: 1234567890,
      kind: 1,
      tags: [
        ['p', 'pubkey1'],
        ['p', 'pubkey2'],
        ['p', 'pubkey3'],
        ['d', 'other_value'],
      ],
      content: '',
      sig: 'sig',
    };

    const values = get_tag_values(event, 'p');
    expect(values).toEqual(['pubkey1', 'pubkey2', 'pubkey3']);
  });

  it('should return empty array when no tags match', () => {
    const event: Event = {
      id: 'event_id',
      pubkey: 'pubkey',
      created_at: 1234567890,
      kind: 1,
      tags: [['d', 'value']],
      content: '',
      sig: 'sig',
    };

    expect(get_tag_values(event, 'p')).toEqual([]);
  });

  it('should handle tags with missing values', () => {
    const event: Event = {
      id: 'event_id',
      pubkey: 'pubkey',
      created_at: 1234567890,
      kind: 1,
      tags: [['p'], ['p', 'pubkey1'], ['p']],
      content: '',
      sig: 'sig',
    };

    const values = get_tag_values(event, 'p');
    expect(values).toEqual(['', 'pubkey1', '']);
  });
});

describe('get_tag_value_by_prefix', () => {
  it('should return tag value when tag exists with matching prefix', () => {
    const event: Event = {
      id: 'event_id',
      pubkey: 'pubkey',
      created_at: 1234567890,
      kind: 1,
      tags: [
        ['a', 'org.attnprotocol:marketplace:marketplace_1'],
        ['a', 'org.attnprotocol:billboard:billboard_1'],
      ],
      content: '',
      sig: 'sig',
    };

    expect(get_tag_value_by_prefix(event, 'a', 'org.attnprotocol:marketplace:')).toBe(
      'org.attnprotocol:marketplace:marketplace_1'
    );
  });

  it('should return empty string when no tag matches prefix', () => {
    const event: Event = {
      id: 'event_id',
      pubkey: 'pubkey',
      created_at: 1234567890,
      kind: 1,
      tags: [['a', 'org.attnprotocol:billboard:billboard_1']],
      content: '',
      sig: 'sig',
    };

    expect(get_tag_value_by_prefix(event, 'a', 'org.attnprotocol:marketplace:')).toBe('');
  });
});

describe('validate_block_height', () => {
  it('should validate block height from t tag', () => {
    const event: Event = {
      id: 'event_id',
      pubkey: 'pubkey',
      created_at: 1234567890,
      kind: 1,
      tags: [['t', '850000']],
      content: '',
      sig: 'sig',
    };

    const result = validate_block_height(event);
    expect(result.valid).toBe(true);
  });

  it('should reject missing t tag', () => {
    const event: Event = {
      id: 'event_id',
      pubkey: 'pubkey',
      created_at: 1234567890,
      kind: 1,
      tags: [],
      content: '',
      sig: 'sig',
    };

    const result = validate_block_height(event);
    expect(result.valid).toBe(false);
    expect(result.message).toContain('Missing block_height');
  });

  it('should reject invalid block height (non-numeric)', () => {
    const event: Event = {
      id: 'event_id',
      pubkey: 'pubkey',
      created_at: 1234567890,
      kind: 1,
      tags: [['t', 'invalid']],
      content: '',
      sig: 'sig',
    };

    const result = validate_block_height(event);
    expect(result.valid).toBe(false);
    expect(result.message).toContain('Invalid block_height');
  });

  it('should reject zero or negative block height', () => {
    const event1: Event = {
      id: 'event_id',
      pubkey: 'pubkey',
      created_at: 1234567890,
      kind: 1,
      tags: [['t', '0']],
      content: '',
      sig: 'sig',
    };

    const event2: Event = {
      id: 'event_id',
      pubkey: 'pubkey',
      created_at: 1234567890,
      kind: 1,
      tags: [['t', '-1']],
      content: '',
      sig: 'sig',
    };

    expect(validate_block_height(event1).valid).toBe(false);
    expect(validate_block_height(event2).valid).toBe(false);
  });
});

describe('validate_sats_per_second', () => {
  it('should validate sats_per_second from content', () => {
    const event: Event = {
      id: 'event_id',
      pubkey: 'pubkey',
      created_at: 1234567890,
      kind: 1,
      tags: [],
      content: JSON.stringify({ sats_per_second: 100 }),
      sig: 'sig',
    };

    const result = validate_sats_per_second(event);
    expect(result.valid).toBe(true);
  });

  it('should validate string sats_per_second', () => {
    const event: Event = {
      id: 'event_id',
      pubkey: 'pubkey',
      created_at: 1234567890,
      kind: 1,
      tags: [],
      content: JSON.stringify({ sats_per_second: '100' }),
      sig: 'sig',
    };

    const result = validate_sats_per_second(event);
    expect(result.valid).toBe(true);
  });

  it('should reject missing sats_per_second', () => {
    const event: Event = {
      id: 'event_id',
      pubkey: 'pubkey',
      created_at: 1234567890,
      kind: 1,
      tags: [],
      content: JSON.stringify({}),
      sig: 'sig',
    };

    const result = validate_sats_per_second(event);
    expect(result.valid).toBe(false);
    expect(result.message).toContain('Missing sats_per_second');
  });

  it('should reject invalid sats_per_second (zero or negative)', () => {
    const event1: Event = {
      id: 'event_id',
      pubkey: 'pubkey',
      created_at: 1234567890,
      kind: 1,
      tags: [],
      content: JSON.stringify({ sats_per_second: 0 }),
      sig: 'sig',
    };

    const event2: Event = {
      id: 'event_id',
      pubkey: 'pubkey',
      created_at: 1234567890,
      kind: 1,
      tags: [],
      content: JSON.stringify({ sats_per_second: -1 }),
      sig: 'sig',
    };

    expect(validate_sats_per_second(event1).valid).toBe(false);
    expect(validate_sats_per_second(event2).valid).toBe(false);
  });
});

describe('validate_json_content', () => {
  it('should validate valid JSON content', () => {
    const event: Event = {
      id: 'event_id',
      pubkey: 'pubkey',
      created_at: 1234567890,
      kind: 1,
      tags: [],
      content: JSON.stringify({ key: 'value' }),
      sig: 'sig',
    };

    const result = validate_json_content(event);
    expect(result.valid).toBe(true);
  });

  it('should validate empty content', () => {
    const event: Event = {
      id: 'event_id',
      pubkey: 'pubkey',
      created_at: 1234567890,
      kind: 1,
      tags: [],
      content: '',
      sig: 'sig',
    };

    const result = validate_json_content(event);
    expect(result.valid).toBe(true);
  });

  it('should reject invalid JSON content', () => {
    const event: Event = {
      id: 'event_id',
      pubkey: 'pubkey',
      created_at: 1234567890,
      kind: 1,
      tags: [],
      content: '{ invalid json }',
      sig: 'sig',
    };

    const result = validate_json_content(event);
    expect(result.valid).toBe(false);
    expect(result.message).toContain('valid JSON');
  });
});

describe('validate_d_tag_prefix', () => {
  it('should validate d tag with matching prefix', () => {
    const event: Event = {
      id: 'event_id',
      pubkey: 'pubkey',
      created_at: 1234567890,
      kind: 1,
      tags: [['d', 'org.attnprotocol:marketplace:marketplace_1']],
      content: '',
      sig: 'sig',
    };

    const result = validate_d_tag_prefix(event, 'org.attnprotocol:marketplace:');
    expect(result.valid).toBe(true);
  });

  it('should reject missing d tag', () => {
    const event: Event = {
      id: 'event_id',
      pubkey: 'pubkey',
      created_at: 1234567890,
      kind: 1,
      tags: [],
      content: '',
      sig: 'sig',
    };

    const result = validate_d_tag_prefix(event, 'org.attnprotocol:');
    expect(result.valid).toBe(false);
    expect(result.message).toContain('Missing d tag');
  });

  it('should reject d tag without matching prefix', () => {
    const event: Event = {
      id: 'event_id',
      pubkey: 'pubkey',
      created_at: 1234567890,
      kind: 1,
      tags: [['d', 'other:prefix:value']],
      content: '',
      sig: 'sig',
    };

    const result = validate_d_tag_prefix(event, 'org.attnprotocol:');
    expect(result.valid).toBe(false);
    expect(result.message).toContain("must start with");
  });
});

describe('validate_a_tag_reference', () => {
  it('should validate a tag with matching prefix', () => {
    const event: Event = {
      id: 'event_id',
      pubkey: 'pubkey',
      created_at: 1234567890,
      kind: 1,
      tags: [
        ['a', 'org.attnprotocol:marketplace:marketplace_1'],
        ['a', 'org.attnprotocol:billboard:billboard_1'],
      ],
      content: '',
      sig: 'sig',
    };

    const result = validate_a_tag_reference(event, 'org.attnprotocol:marketplace:');
    expect(result.valid).toBe(true);
  });

  it('should reject missing a tag with prefix', () => {
    const event: Event = {
      id: 'event_id',
      pubkey: 'pubkey',
      created_at: 1234567890,
      kind: 1,
      tags: [['a', 'org.attnprotocol:billboard:billboard_1']],
      content: '',
      sig: 'sig',
    };

    const result = validate_a_tag_reference(event, 'org.attnprotocol:marketplace:');
    expect(result.valid).toBe(false);
    expect(result.message).toContain("Must reference");
  });
});

describe('validate_pubkey', () => {
  it('should validate valid pubkey', () => {
    const pubkey = 'a'.repeat(64);
    const result = validate_pubkey(pubkey);
    expect(result.valid).toBe(true);
  });

  it('should validate hex pubkey', () => {
    const pubkey = '0123456789abcdef'.repeat(4);
    const result = validate_pubkey(pubkey);
    expect(result.valid).toBe(true);
  });

  it('should reject pubkey with wrong length', () => {
    const pubkey1 = 'a'.repeat(63);
    const pubkey2 = 'a'.repeat(65);

    expect(validate_pubkey(pubkey1).valid).toBe(false);
    expect(validate_pubkey(pubkey2).valid).toBe(false);
  });

  it('should reject empty pubkey', () => {
    const result = validate_pubkey('');
    expect(result.valid).toBe(false);
    expect(result.message).toContain('Invalid pubkey format');
  });

  it('should reject non-hex pubkey', () => {
    const pubkey = 'g'.repeat(64);
    const result = validate_pubkey(pubkey);
    expect(result.valid).toBe(false);
    expect(result.message).toContain('hexadecimal');
  });
});

