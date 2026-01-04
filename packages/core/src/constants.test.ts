import { describe, it, expect } from 'vitest';
import { ATTN_EVENT_KINDS, NIP51_LIST_TYPES, CITY_PROTOCOL_KINDS } from './constants.js';

describe('ATTN_EVENT_KINDS', () => {
  it('should export all required event kinds', () => {
    // Note: BLOCK (38088) was removed - block events are now published by City Protocol (Kind 38808)
    expect(ATTN_EVENT_KINDS.MARKETPLACE).toBe(38188);
    expect(ATTN_EVENT_KINDS.BILLBOARD).toBe(38288);
    expect(ATTN_EVENT_KINDS.PROMOTION).toBe(38388);
    expect(ATTN_EVENT_KINDS.ATTENTION).toBe(38488);
    expect(ATTN_EVENT_KINDS.BILLBOARD_CONFIRMATION).toBe(38588);
    expect(ATTN_EVENT_KINDS.ATTENTION_CONFIRMATION).toBe(38688);
    expect(ATTN_EVENT_KINDS.MARKETPLACE_CONFIRMATION).toBe(38788);
    expect(ATTN_EVENT_KINDS.MATCH).toBe(38888);
    expect(ATTN_EVENT_KINDS.ATTENTION_PAYMENT_CONFIRMATION).toBe(38988);
  });

  it('should have all event kinds as numbers', () => {
    const kinds = Object.values(ATTN_EVENT_KINDS);
    kinds.forEach((kind) => {
      expect(typeof kind).toBe('number');
      expect(kind).toBeGreaterThan(0);
    });
  });

  it('should have unique event kind values', () => {
    const kinds = Object.values(ATTN_EVENT_KINDS);
    const unique_kinds = new Set(kinds);
    expect(unique_kinds.size).toBe(kinds.length);
  });
});

describe('NIP51_LIST_TYPES', () => {
  it('should export all required list types', () => {
    expect(NIP51_LIST_TYPES.BLOCKED_PROMOTIONS).toBe('org.attnprotocol:promotion:blocked');
    expect(NIP51_LIST_TYPES.BLOCKED_PROMOTERS).toBe('org.attnprotocol:promoter:blocked');
    expect(NIP51_LIST_TYPES.TRUSTED_BILLBOARDS).toBe('org.attnprotocol:billboard:trusted');
    expect(NIP51_LIST_TYPES.TRUSTED_MARKETPLACES).toBe('org.attnprotocol:marketplace:trusted');
  });

  it('should have all list types as strings', () => {
    const list_types = Object.values(NIP51_LIST_TYPES);
    list_types.forEach((list_type) => {
      expect(typeof list_type).toBe('string');
      expect(list_type.length).toBeGreaterThan(0);
    });
  });

  it('should have unique list type values', () => {
    const list_types = Object.values(NIP51_LIST_TYPES);
    const unique_list_types = new Set(list_types);
    expect(unique_list_types.size).toBe(list_types.length);
  });

  it('should have list types with org.attnprotocol prefix', () => {
    const list_types = Object.values(NIP51_LIST_TYPES);
    list_types.forEach((list_type) => {
      expect(list_type).toMatch(/^org\.attnprotocol:/);
    });
  });
});

describe('CITY_PROTOCOL_KINDS', () => {
  it('should export City Protocol block kind', () => {
    expect(CITY_PROTOCOL_KINDS.BLOCK).toBe(38808);
  });
});

