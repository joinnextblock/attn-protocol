# PROMO PROTOCOL

## Table of Contents
- [What is the PROMO PROTOCOL?](#what-is-the-promo-protocol)
- [How does it work?](#how-does-it-work)
- [Why is this better than centralized advertising?](#why-is-this-better-than-centralized-advertising)
- [How do I participate as a PROMOTER?](#how-do-i-participate-as-a-promoter)
- [How do I participate as a PROMOTION VIEWER?](#how-do-i-participate-as-a-promotion-viewer)
- [How do I filter the PROMOTIONS I see?](#how-do-i-filter-the-promotions-i-see)
- [How do PROMOTION VIEWER block lists work?](#how-do-promotion-viewer-block-lists-work)
- [What types of content can I choose to see?](#what-types-of-content-can-i-choose-to-see)
- [How do I run a BILLBOARD?](#how-do-i-run-a-billboard)
- [How do PROMOTIONS begin and end?](#how-do-promotions-begin-and-end)
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
- **Event Kind 28888**: BILLBOARD configuration events
- **Event Kind 18888**: PROMOTER promotion requests
- **Event Kind 17888**: PROMOTION VIEWER availability signals
- **Standard Relays**: For event propagation between participants

### Basic Workflow
1. BILLBOARD OPERATORS publish configuration events (kind:28888)
2. PROMOTION VIEWERS announce availability by publishing kind:17888 events
3. PROMOTERS request promotion of specific notes via kind:18888 events
4. BILLBOARDs match compatible PROMOTERS and PROMOTION VIEWERS
5. BILLBOARDs verify content viewing and facilitate payment
6. All parties can monitor engagement via statistical events

## Why is this better than centralized advertising?

### Market-Driven Trust Systems
- Natural competition between BILLBOARD OPERATORS improves services and lowers fees
- Specialized BILLBOARDs can emerge for different content niches and audience segments
- Operators build reputation as their primary capital, incentivizing honest behavior
- Similar to how [Cashu](https://cashu.space) mint operators compete in the ecash ecosystem

### Protocol-Level Neutrality
- Defines communication formats and workflows without dictating implementation details
- Allows different technical solutions to verification, payment, and matching challenges
- Enables continuous experimentation and improvement by different operators

### True User Sovereignty
- PROMOTION VIEWERS explicitly choose what content to view and for what compensation
- PROMOTERS determine their own budgets and targeting parameters
- Direct value exchange without platforms extracting the majority of value
- All participants select which BILLBOARD OPERATORS they trust
- PROMOTION VIEWERS can block specific PROMOTIONS or PROMOTERS they don't want to see
- PROMOTION VIEWERS can filter content by type (text, images, videos) based on preferences

### Resilience Through Decentralization
- No single point of failure or censorship
- Diverse content policies across different BILLBOARD operators
- Lower barrier to entry compared to centralized advertising networks
- Persistence of the network despite individual node failures

### Scalability Through Composability
- Specialized implementations can focus on solving specific challenges
- Leverages existing Nostr infrastructure rather than building from scratch
- Allows for progressive enhancement as more sophisticated solutions develop

## How do I participate as a PROMOTER?

As a PROMOTER in the protocol, you can:
- Specify Nostr Events to promote
- Set custom bid amounts in `sats_per_second`
- Define required viewing durations for content
- Choose trusted BILLBOARD nodes for verification
- Submit PROMOTION requests through Nostr events (kind: 18888)
- Exercise direct control over PROMOTION parameters

PROMOTERS publish kind:18888 events to initiate PROMOTIONS, specifying their bid, the content to promote, and which BILLBOARD operators they trust.

## How do I participate as a PROMOTION VIEWER?

As a PROMOTION VIEWER in the protocol, you can:
- Set personal asking prices in `sats_per_second`
- Select trusted BILLBOARD operators
- Earn by viewing promoted content
- Participate through simple Nostr events (kind: 17888)
- Maintain full control over which content to view
- Adjust asking prices based on market conditions
- Create and maintain block lists to filter out unwanted PROMOTIONS
- Specify which kinds of content you're willing to view (text, images, videos, etc.)

PROMOTION VIEWERS publish kind:17888 events to signal availability, specifying their asking price and which BILLBOARD operators they accept. They can also reference a [NIP-51](https://github.com/nostr-protocol/nips/blob/master/51.md) list (kind:30003) to block specific PROMOTIONS or PROMOTERS.

## How do I filter the PROMOTIONS I see?

The PROMO PROTOCOL gives you complete control over which PROMOTIONS you see:

- **Block specific PROMOTIONS**: Add any PROMOTION event ID to your block list
- **Block specific PROMOTERS**: Add any PROMOTER's pubkey to your block list
- **Filter by content type**: Specify which kinds of content you're willing to see promoted
- **Default allow model**: You'll only see PROMOTIONS you haven't explicitly blocked
- **Real-time updates**: Your preference changes take effect immediately

These filtering capabilities ensure you maintain control over your promotional content experience while still participating in the ecosystem.

## How do PROMOTION VIEWER block lists work?

Block lists in the PROMO PROTOCOL use the [NIP-51](https://github.com/nostr-protocol/nips/blob/master/51.md) standard:

1. **Creating a block list**: Publish a parameterized replaceable list (kind:30003) with the d-tag "promotions-block-list"
2. **Blocking PROMOTIONS**: Add the event IDs of objectionable PROMOTIONS as e-tags
3. **Blocking PROMOTERS**: Add the pubkeys of objectionable PROMOTERS as p-tags
4. **Referencing your block list**: Include a "global_block_list" tag in your kind:17888 PROMOTION VIEWER event
5. **Updating preferences**: Publish a new version of your block list to update your preferences

BILLBOARDs must fetch and respect your block list when matching PROMOTIONS, ensuring you never see content you've chosen to block.

## What types of content can I choose to see?

You can specify exactly which types of promoted content you're willing to view:

- Use "k" tags in your kind:17888 PROMOTION VIEWER event to list accepted content kinds
- For example:
  - `["k", "20"]` for media content ([NIP-68](https://github.com/nostr-protocol/nips/blob/master/68.md))
  - `["k", "22"]` for short vertical video ([NIP-71](https://github.com/nostr-protocol/nips/blob/master/71.md))
- If you include any "k" tags, BILLBOARDs will only show you promoted content of those kinds
- If you don't include "k" tags, BILLBOARDs may show you any kind of content (unless blocked)

This gives you fine-grained control over the format of PROMOTIONS you receive.

## How do I run a BILLBOARD?

BILLBOARD operators maintain full autonomy over implementation details. The protocol defines only the communication standards, while operators can:
- Choose how to handle event deletions
- Implement custom matching algorithms
- Select verification methods
- Establish fee structures
- Determine event caching/storage policies
- Deploy anti-fraud measures
- Define business logic

As a BILLBOARD Operator, you:
- Serve as verification infrastructure
- Configure viewing duration requirements
- Set customizable service fees
- Validate transactions between PROMOTERS and PROMOTION VIEWERS
- Update market conditions at configurable intervals
- Operate through standard Nostr events (kind: 28888)


This design encourages market-driven selection of effective BILLBOARD implementations and practices.

## How do PROMOTIONS begin and end?

### PROMOTION Lifecycle
- PROMOTIONS begin when PROMOTERS publish kind:18888 events
- PROMOTIONS remain active until:
  1. The PROMOTER publishes a kind:5 event deleting the PROMOTION
  2. The BILLBOARD terminates the PROMOTION based on its criteria
- BILLBOARDs must monitor for and respect deletion events

## What's the economic model?

### Economic Architecture
- Market-driven pricing mechanism with no central rate setting
- Direct peer-to-peer economic relationship between PROMOTERS and PROMOTION VIEWERS
- BILLBOARD fee structure clearly defined in kind:28888 events
- All monetary values denominated in satoshis for consistency
- BILLBOARDs only match PROMOTERS and PROMOTION VIEWERS when bid ≥ ask

## How is trust established?

### Trust Framework
- Decentralized trust model with no central authority
- Explicit pubkey-based BILLBOARD selection by both PROMOTERS and PROMOTION VIEWERS
- Self-sovereign trust relationships maintained by individual participants
- Trust signals propagated through successful transaction history
- Market incentives naturally align with honest operation

## Content Preferences and Filtering

The protocol supports robust content filtering options for viewers:

### Block List Capabilities
- PROMOTION VIEWERS can maintain personal block lists for unwanted PROMOTIONS
- PROMOTION VIEWERS can block specific PROMOTION event IDs using NIP-51 lists
- PROMOTION VIEWERS can block all PROMOTIONS from specific PROMOTERS
- PROMOTION VIEWERS can specify which content types (kinds) they're willing to view

### Implementation
- Block lists are maintained as addressable NIP-51 lists (kind:30003)
- Preferences are expressed in kind:17888 PROMOTION VIEWER events
- BILLBOARDs must respect all viewer preferences when matching PROMOTIONS
- All preferences update in real-time when viewers publish changes

### Preference Evaluation Rules
1. **Addressable Block List**: Block list is maintained as an addressable NIP-51 list
2. **Default Allow**: All PROMOTIONS are implicitly allowed unless explicitly blocked
3. **Kind Filtering**: Promoted content must be of a kind specified in a `k` tag (if any `k` tags are present)
4. **Most Specific First**: PROMOTION-level block lists take precedence over PROMOTER-level block lists
5. **Block List Priority**: If a PROMOTION is blocked, it must not be shown regardless of other factors

### Privacy Considerations
- PROMOTION VIEWER block lists are public, as they are published in Nostr events
- Aggregated metrics may include overall matching rates without identifying specific block list patterns

## Technical Specifications & Documentation

### NIP List
- [NIP-X1](./NIP-X1.md): BASIC PROTOCOL
- [NIP-X2](./NIP-X2.md): BILLBOARD METRICS
- [NIP-X3](./NIP-X3.md): PROMOTION VIEWER BLOCK LIST
- [NIP-X4](./NIP-X4.md): PROMOTION VIEWER PREFERRED TOPICS
- [NIP-X5](./NIP-X5.md): PROMOTION PREFERRED TOPICS
- NIP-XX: BILLBOARD STATISTICS (coming soon)
- NIP-XX: LIGHTNING PAYMENTS (coming soon)
- NIP-XX: ECASH PAYMENTS (coming soon)