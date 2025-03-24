# PROMO PROTOCOL

## Table of Contents
- [What is the PROMO PROTOCOL?](#what-is-the-promo-protocol)
- [How does it work?](#how-does-it-work)
- [Why is this better than centralized advertising?](#why-is-this-better-than-centralized-advertising)
- [How do I participate as a content promoter?](#how-do-i-participate-as-a-content-promoter)
- [How do I participate as a content viewer?](#how-do-i-participate-as-a-content-viewer)
- [How do I filter the promotions I see?](#how-do-i-filter-the-promotions-i-see)
- [How do block lists work?](#how-do-block-lists-work)
- [What types of content can I choose to see?](#what-types-of-content-can-i-choose-to-see)
- [How do I run a billboard?](#how-do-i-run-a-billboard)
- [How do promotions begin and end?](#how-do-promotions-begin-and-end)
- [What's the economic model?](#whats-the-economic-model)
- [How is trust established?](#how-is-trust-established)
- [Content Preferences and Filtering](#content-preferences-and-filtering)
- [Technical Specifications & Documentation](#technical-specifications--documentation)

## What is the PROMO PROTOCOL?

A decentralized framework enabling paid content promotion within the Nostr ecosystem. By establishing standardized communication methods for promotional content, the protocol creates new economic opportunities while preserving Nostr's core principles of decentralization and privacy.

### Key Features
- Pay-per-view content promotion system
- Satoshi-based payment infrastructure 
- Market-driven pricing mechanism
- User-controlled content filtering and preferences

## How does it work?

The protocol connects three types of participants through standardized Nostr events:

### Protocol Components
- **Event Kind 28888**: Billboard configuration events
- **Event Kind 18888**: Buyer promotion requests
- **Event Kind 17888**: Seller availability signals
- **Standard Relays**: For event propagation between participants

### Basic Workflow
1. Billboard operators publish configuration events (kind:28888)
2. Sellers announce availability by publishing kind:17888 events
3. Buyers request promotion of specific notes via kind:18888 events
4. Billboards match compatible buyers and sellers
5. Billboards verify content viewing and facilitate payment
6. All parties can monitor engagement via statistical events

## Why is this better than centralized advertising?

### Market-Driven Trust Systems
- Natural competition between billboard operators improves services and lowers fees
- Specialized billboards can emerge for different content niches and audience segments
- Operators build reputation as their primary capital, incentivizing honest behavior
- Similar to how [Cashu](https://cashu.space) mint operators compete in the ecash ecosystem

### Protocol-Level Neutrality
- Defines communication formats and workflows without dictating implementation details
- Allows different technical solutions to verification, payment, and matching challenges
- Enables continuous experimentation and improvement by different operators

### True User Sovereignty
- Viewers explicitly choose what content to view and for what compensation
- Promoters determine their own budgets and targeting parameters
- Direct value exchange without platforms extracting the majority of value
- All participants select which billboard operators they trust
- Viewers can block specific promotions or promoters they don't want to see
- Viewers can filter content by type (text, images, videos) based on preferences

### Resilience Through Decentralization
- No single point of failure or censorship
- Diverse content policies across different billboard operators
- Lower barrier to entry compared to centralized advertising networks
- Persistence of the network despite individual node failures

### Scalability Through Composability
- Specialized implementations can focus on solving specific challenges
- Leverages existing Nostr infrastructure rather than building from scratch
- Allows for progressive enhancement as more sophisticated solutions develop

## How do I participate as a content promoter?

As a Buyer in the protocol, you can:
- Specify Nostr Events to promote
- Set custom bid amounts in `sats_per_second`
- Define required viewing durations for content
- Choose trusted billboard nodes for verification
- Submit promotion requests through Nostr events (kind: 18888)
- Exercise direct control over promotion parameters

Buyers publish kind:18888 events to initiate promotions, specifying their bid, the content to promote, and which billboard operators they trust.

## How do I participate as a content viewer?

As a Seller in the protocol, you can:
- Set personal asking prices in `sats_per_second`
- Select trusted billboard operators
- Earn by viewing promoted content
- Participate through simple Nostr events (kind: 17888)
- Maintain full control over which content to view
- Adjust asking prices based on market conditions
- Create and maintain block lists to filter out unwanted promotions
- Specify which kinds of content you're willing to view (text, images, videos, etc.)

Sellers publish kind:17888 events to signal availability, specifying their asking price and which billboard operators they accept. They can also reference a NIP-51 list (kind:30003) to block specific promotions or promoters.

## How do I filter the promotions I see?

The PROMO PROTOCOL gives you complete control over which promotions you see:

- **Block specific promotions**: Add any promotion event ID to your block list
- **Block specific promoters**: Add any promoter's pubkey to your block list
- **Filter by content type**: Specify which kinds of content you're willing to see promoted
- **Default allow model**: You'll only see promotions you haven't explicitly blocked
- **Real-time updates**: Your preference changes take effect immediately

These filtering capabilities ensure you maintain control over your promotional content experience while still participating in the ecosystem.

## How do block lists work?

Block lists in the PROMO PROTOCOL use the NIP-51 standard:

1. **Creating a block list**: Publish a parameterized replaceable list (kind:30003) with the d-tag "promotions-block-list"
2. **Blocking promotions**: Add the event IDs of objectionable promotions as e-tags
3. **Blocking promoters**: Add the pubkeys of objectionable promoters as p-tags
4. **Referencing your block list**: Include a "global_block_list" tag in your kind:17888 seller event
5. **Updating preferences**: Publish a new version of your block list to update your preferences

Billboards must fetch and respect your block list when matching promotions, ensuring you never see content you've chosen to block.

## What types of content can I choose to see?

You can specify exactly which types of promoted content you're willing to view:

- Use "k" tags in your kind:17888 seller event to list accepted content kinds
- For example:
  - `["k", "1"]` for regular text notes
  - `["k", "20"]` for media content (NIP-68)
  - `["k", "22"]` for short vertical video (NIP-71)
- If you include any "k" tags, billboards will only show you promoted content of those kinds
- If you don't include "k" tags, billboards may show you any kind of content (unless blocked)

This gives you fine-grained control over the format of promotions you receive.

## How do I run a billboard?

Billboard operators maintain full autonomy over implementation details. The protocol defines only the communication standards, while operators can:
- Choose how to handle event deletions
- Implement custom matching algorithms
- Select verification methods
- Establish fee structures
- Determine event caching/storage policies
- Deploy anti-fraud measures
- Define business logic

As a Billboard Operator, you:
- Serve as verification infrastructure
- Configure viewing duration requirements
- Set customizable service fees
- Validate transactions between buyers and sellers
- Update market conditions at configurable intervals
- Operate through standard Nostr events (kind: 28888)

This design encourages market-driven selection of effective billboard implementations and practices.

## How do promotions begin and end?

### Promotion Lifecycle
- Promotions begin when buyers publish kind:18888 events
- Promotions remain active until:
  1. The buyer publishes a kind:5 event deleting the promotion
  2. The billboard terminates the promotion based on its criteria
- Billboards must monitor for and respect deletion events

## What's the economic model?

### Economic Architecture
- Market-driven pricing mechanism with no central rate setting
- Direct peer-to-peer economic relationship between buyers and sellers
- Billboard fee structure clearly defined in kind:28888 events
- All monetary values denominated in satoshis for consistency
- Billboards only match BUYERS and SELLERS when bid ≥ ask

## How is trust established?

### Trust Framework
- Decentralized trust model with no central authority
- Explicit pubkey-based billboard selection by both buyers and sellers
- Self-sovereign trust relationships maintained by individual participants
- Trust signals propagated through successful transaction history
- Market incentives naturally align with honest operation

## Content Preferences and Filtering

The protocol supports robust content filtering options for viewers:

### Block List Capabilities
- Viewers can maintain personal block lists for unwanted promotions
- Block specific promotion event IDs using NIP-51 lists
- Block all content from specific promoter pubkeys
- Specify which content types (kinds) they're willing to view

### Implementation
- Block lists are maintained as addressable NIP-51 lists (kind:30003)
- Preferences are expressed in kind:17888 seller events
- Billboards must respect all viewer preferences when matching promotions
- All preferences update in real-time when viewers publish changes

### Preference Evaluation Rules
1. **Addressable Block List**: Block list is maintained as an addressable NIP-51 list
2. **Default Allow**: All promotions are implicitly allowed unless explicitly blocked
3. **Kind Filtering**: Promoted content must be of a kind specified in a `k` tag (if any `k` tags are present)
4. **Most Specific First**: Promotion-level block lists take precedence over promoter-level block lists
5. **Block List Priority**: If a promotion is blocked, it must not be shown regardless of other factors

### Privacy Considerations
- Seller promotion block list preferences are public, as they are published in Nostr events
- Aggregated metrics may include overall matching rates without identifying specific block list patterns

## Technical Specifications & Documentation

### NIP List
- [NIP-X1](./NIP-X1.md): BASIC PROTOCOL
- [NIP-X2](./NIP-X2.md): BILLBOARD METRICS
- [NIP-X3](./NIP-X3.md): SELLER BLOCK LIST
- NIP-XX: BUYER PREFERNCES (coming soon)
- NIP-XX: BILLBOARD STATISTICS (coming soon)
- NIP-XX: LIGHTNING PAYMENTS (coming soon)
- NIP-XX: ECASH PAYMENTS (coming soon)