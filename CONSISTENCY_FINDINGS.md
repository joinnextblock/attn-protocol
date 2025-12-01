# ATTN-01 Consistency Review Findings

This document tracks all inconsistencies found between the ATTN-01 specification and the implementation in core, sdk, and framework packages.

## Summary

- **Total Issues Found**: 0
- **Critical Issues**: 0
- **Medium Issues**: 0
- **Low Issues**: 0

**Status**: ✅ All packages are consistent with ATTN-01 specification

## Review Status

- [x] Core package constants
- [x] Core package types
- [x] SDK event builders (all 9 events)
- [x] SDK types
- [x] SDK validation
- [x] SDK formatting
- [x] Framework package

## Detailed Findings

### Core Package

#### constants.ts
- ✅ All 9 event kinds match spec (38088-38888)
- ✅ NIP-51 list types match spec exactly

#### types.ts
- ✅ Base types are appropriate (BlockHeight, Pubkey, EventId, RelayUrl)

### SDK Package

#### Event Builders

##### BLOCK (38088)
- ✅ d tag format: `org.attnprotocol:block:<height>:<hash>` - correct
- ✅ Content fields: height, hash, time?, ref_node_pubkey, ref_block_id - all present
- ✅ Tags: d, t, p, r - all present
- ✅ ref_node_pubkey correctly derived from event.pubkey
- ✅ ref_block_id matches d tag value

##### MARKETPLACE (38188)
- ✅ d tag format: `org.attnprotocol:marketplace:<marketplace_id>` - correct
- ✅ Content fields: all required fields present (name, description, admin_pubkey, min_duration, max_duration, match_fee_sats, confirmation_fee_sats, ref_* fields)
- ✅ Tags: d, t, a (block coordinate), k (kind_list), p (marketplace + node pubkeys), r (relay_list), u (optional) - all present
- ✅ kind_list and relay_list NOT in content (tags only) - correct

##### BILLBOARD (38288)
- ✅ d tag format: `org.attnprotocol:billboard:<billboard_id>` - correct
- ✅ Content fields: name, description?, confirmation_fee_sats, ref_billboard_pubkey, ref_billboard_id, ref_marketplace_pubkey, ref_marketplace_id - all present
- ✅ Tags: d, t, a (marketplace coordinate), p (billboard + marketplace), r, k, u - all present

##### PROMOTION (38388)
- ✅ d tag format: `org.attnprotocol:promotion:<promotion_id>` - correct
- ✅ Content fields: duration, bid, event_id, call_to_action, call_to_action_url, escrow_id_list, ref_* fields - all present
- ✅ Tags: d, t, a (marketplace, video, billboard coordinates), p (marketplace, billboard, promotion), r, k, u - all present

##### ATTENTION (38488)
- ✅ d tag format: `org.attnprotocol:attention:<attention_id>` - correct
- ✅ Content fields: ask, min_duration, max_duration, blocked_promotions_id, blocked_promoters_id, trusted_marketplaces_id?, trusted_billboards_id?, ref_* fields - all present
- ✅ Tags: d, t, a (marketplace, blocked lists, optional trusted lists), p (attention + marketplace), r (relays), k (kinds) - all present
- ✅ blocked_promotions_id and blocked_promoters_id required - correct
- ✅ trusted_marketplaces_id and trusted_billboards_id optional - correct
- ✅ kinds and relays NOT in content (tags only) - correct

##### MATCH (38888)
- ✅ d tag format: `org.attnprotocol:match:<match_id>` - correct
- ✅ Content fields: ONLY ref_* fields (no bid, ask, duration) - correct
- ✅ Tags: d, t, a (all coordinates), p (all party pubkeys), r (optional), k (optional) - all present

##### BILLBOARD_CONFIRMATION (38588)
- ✅ d tag format: `org.attnprotocol:billboard-confirmation:<confirmation_id>` - correct
- ✅ Content fields: ONLY ref_* fields - correct
- ✅ Tags: d, t, e (with "match" marker on match_event_id, plus other event IDs), a (all coordinates), p (all party pubkeys), r (optional) - all present

##### ATTENTION_CONFIRMATION (38688)
- ✅ d tag format: `org.attnprotocol:attention-confirmation:<confirmation_id>` - correct
- ✅ Content fields: ONLY ref_* fields - correct
- ✅ Tags: d, t, e (with "match" marker on match_event_id, plus other event IDs), a (all coordinates), p (all party pubkeys), r (optional) - all present

##### MARKETPLACE_CONFIRMATION (38788)
- ✅ d tag format: `org.attnprotocol:marketplace-confirmation:<confirmation_id>` - correct
- ✅ Content fields: ONLY ref_* fields (payment ID lists removed per recent update) - correct
- ✅ Tags: d, t, e (with markers: "match", "billboard_confirmation", "attention_confirmation", plus other event IDs), a (all coordinates), p (all party pubkeys), r (optional) - all present

#### Types (events.ts)
- ✅ All parameter interfaces match ATTN-01 schemas
- ✅ Required fields marked correctly
- ✅ Optional fields marked correctly
- ✅ Payment ID lists removed from MarketplaceConfirmationEventParams (already fixed)

#### Validation (validation.ts)
- ✅ validate_block_height checks t tag (required per ATTN-01)
- ✅ validate_d_tag_prefix checks d tag format
- ✅ validate_a_tag_reference checks a tag references
- ✅ validate_pubkey checks pubkey format
- ✅ validate_json_content checks JSON validity

#### Formatting (formatting.ts)
- ✅ format_d_tag creates `org.attnprotocol:<event_type>:<identifier>` format - correct
- ✅ format_coordinate creates `kind:pubkey:d_tag` format - correct

### Framework Package

- ✅ Uses ATTN_EVENT_KINDS from @attn-protocol/core - correct
- ✅ Uses NIP51_LIST_TYPES from @attn-protocol/core - correct
- ✅ All event kinds referenced correctly
- ✅ Framework is protocol-agnostic (hooks and relay connection only) - correct

## Issues

None found. All packages are consistent with ATTN-01 specification.

## Notes

1. Payment ID lists (inbound_id_list, viewer_id_list, billboard_id_list) were removed from MARKETPLACE_CONFIRMATION event as part of this review, matching the updated specification.

2. All event builders correctly implement:
   - Flat content structure (no nested objects)
   - Tag-only fields (kind_list, relay_list) not in content
   - Proper d tag formatting with `org.attnprotocol:` prefix
   - Proper coordinate formatting for a tags
   - Required t tag (block height) on every event
   - Proper ref_ prefix for reference fields

3. All protocol events (including confirmation events) now have d tags per specification update.

4. All naming conventions followed:
   - Event-specific fields: no prefix
   - Reference fields: `ref_` prefix
   - Arrays: `_list` suffix
   - Fees: `{entity}_{fee_type}_fee_sats`
