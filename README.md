
# BILLBOARDS & PROMOTED NOTES

## Executive Summary
The Promoted Notes are a decentralized framework enabling paid content promotion within the Nostr ecosystem. By establishing standardized communication methods for promotional content, the protocol creates new economic opportunities while preserving Nostr's core principles of decentralization and privacy.

## Key Features
- Pay-per-view content promotion system
- Satoshi-based payment infrastructure
- Direct audience targeting capabilities
- Transparent engagement metrics
- No centralized intermediaries

## Economic Architecture
- Market-driven pricing mechanism with no central rate setting
- Direct peer-to-peer economic relationship between buyers and sellers
- Billboard fee structure clearly defined in kind:28888 events
- All monetary values denominated in satoshis for consistency
- Billboards only match BUYERs and SELLERS when bid ≥ ask

## Trust Framework
- Decentralized trust model with no central authority
- Explicit pubkey-based billboard selection by both buyers and sellers
- Self-sovereign trust relationships maintained by individual participants
- Trust signals propagated through successful transaction history
- Market incentives naturally align with honest operation

## Billboard Operation
Billboard operators maintain full autonomy over implementation details. The protocol defines only the communication standards, while operators can:
- Choose how to handle event deletions
- Implement custom matching algorithms
- Select verification methods
- Establish fee structures
- Determine event caching/storage policies
- Deploy anti-fraud measures
- Define business logic

This design encourages market-driven selection of effective billboard implementations and practices.

## Stakeholders

### Billboard Operators
- Serve as verification infrastructure
- Configure viewing duration requirements
- Set customizable service fees
- Validate transactions between buyers and sellers
- Update market conditions at configurable intervals
- Operate through standard Nostr events (kind: 28888)

### Sellers
- Set personal asking prices in `sats_per_second`
- Select trusted billboard operators
- Earn by viewing promoted content
- Participate through simple Nostr events (kind: 17888)
- Maintain full control over which content to view
- Adjust asking prices based on market conditions

### Buyers
- Specify Nostr Events to promote
- Set custom bid amounts in `sats_per_second`
- Define required viewing durations for content
- Choose trusted billboard nodes for verification
- Submit promotion requests through Nostr events (kind: 18888)
- Exercise direct control over promotion parameters

### NIP List
- [NIP-X1](./NIP-X1.md): BASIC PROTOCOL
- [NIP-X2](./NIP-X2.md): BILLBOARD METRICS
- [NIP-X3](./NIP-X3.md): SELLER BLACKLIST
- NIP-XX: SELLER PREFERNCES (coming soon)
- NIP-XX: BUYER PREFERNCES (coming soon)
- NIP-XX: BILLBOARD STATISTICS (coming soon)
- NIP-XX: LIGHTNING PAYMENTS (coming soon)
- NIP-XX: ECASH PAYMENTS (coming soon)