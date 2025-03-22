
# THE PROMOTED NOTE PROTOCOL

## Executive Summary
The Promoted Note Protocol is a decentralized framework enabling paid content promotion within the Nostr ecosystem. By establishing standardized communication methods for promotional content, the protocol creates new economic opportunities while preserving Nostr's core principles of decentralization and privacy.

## Key Features
- Pay-per-view content promotion system
- Satoshi-based payment infrastructure
- Direct audience targeting capabilities
- Transparent engagement metrics
- No centralized intermediaries

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

## Stakeholder Benefits

### Billboard Operators
- Serve as verification infrastructure
- Configure viewing duration requirements
- Set customizable service fees
- Validate transactions between buyers and sellers
- Update market conditions at configurable intervals
- Operate through standard Nostr events (kind: 28888)

### Sellers
- Set personal asking prices in satoshis
- Select trusted billboard operators
- Earn by viewing promoted content
- Participate through simple Nostr events (kind: 17888)
- Maintain full control over which content to view
- Adjust asking prices based on market conditions

### Buyers
- Specify Nostr notes to promote (via event IDs)
- Set custom bid amounts in satoshis
- Define required viewing durations for content
- Choose trusted billboard nodes for verification
- Submit promotion requests through Nostr events (kind: 18888)
- Exercise direct control over promotion parameters

### Small Businesses
- Access cost-effective advertising with flexible budgets
- Pay only for actual engagement
- Target audiences directly
- Manage bids in real-time
- Operate as their own billboard operator if desired

### Content Creators
- Access dual revenue opportunities (promotion and viewing)
- Monetize creative work directly
- Control promotion strategies
- Earn satoshis through content viewing
- Operate as their own billboard operator if desired

The protocol establishes a sustainable ecosystem where participants can both promote content and earn from viewing others' promotions, all while maintaining creative independence and privacy. Billboard Operators provide the crucial verification layer that ensures trust and transparency in the promotion network.

## Promoted Note Implementation Possibilities (PNIPs)
The Promoted Note Protocol is improved through PNIPs (Promoted Note Implementation Possibilities).

### List
- [PNIP-01](./PNIP-01.md): BASIC PROTOCOL

## License
All PNIPs are public domain.
