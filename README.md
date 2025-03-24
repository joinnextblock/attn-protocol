# PROMO PROTOCOL

## Table of Contents
- [What is the PROMO PROTOCOL?](#what-is-the-promo-protocol)
- [Who are the main actors in the PROMO PROTOCOL?](#who-are-the-main-actors-in-the-promo-protocol)
- [How does it work?](#how-does-it-work)
- [Why is this better than centralized advertising?](#why-is-this-better-than-centralized-advertising)
- [How do I participate as a PROMOTER?](#how-do-i-participate-as-a-promoter)
- [How do I participate as a PROMOTION VIEWER?](#how-do-i-participate-as-a-promotion-viewer)
- [How do I filter the PROMOTIONS I see?](#how-do-i-filter-the-promotions-i-see)
- [How do PROMOTION VIEWER block lists work?](#how-do-promotion-viewer-block-lists-work)
- [What types of content can I choose to see?](#what-types-of-content-can-i-choose-to-see)
- [How does topic-based matching work between PROMOTERS and PROMOTION VIEWERS?](#how-does-topic-based-matching-work-between-promoters-and-promotion-viewers)
- [How do I run a BILLBOARD?](#how-do-i-run-a-billboard)
- [How do PROMOTIONS begin and end?](#how-do-promotions-begin-and-end)
- [How are PROMOTION views verified?](#how-are-promotion-views-verified)
- [How do PROMOTERS access and interpret their campaign analytics?](#how-do-promoters-access-and-interpret-their-campaign-analytics)
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

## Who are the main actors in the PROMO PROTOCOL?

The PROMO PROTOCOL operates through the interaction of four main actors, each with distinct roles and responsibilities:

1. **PROMOTERS**: 
   - Publish kind:18888 events to promote specific Nostr notes
   - Set payment rates (sats_per_second) for content viewing
   - Specify required viewing duration
   - Choose which BILLBOARD operators they trust
   - Monitor campaign performance through metrics

2. **PROMOTION VIEWERS**:
   - Publish kind:17888 events signaling availability for viewing promotions
   - Set their asking price (minimum sats_per_second)
   - Specify trusted BILLBOARD operators
   - Control content preferences through topic tags and content kind filters
   - Maintain block lists for unwanted content or PROMOTERS

3. **BILLBOARD OPERATORS**:
   - Publish kind:28888 configuration events defining their services
   - Match compatible PROMOTERS with PROMOTION VIEWERS
   - Verify content viewing through technical means
   - Publish confirmation events (kind:28889) for completed views
   - Provide metrics and analytics through kind:38891 events
   - Facilitate payments between PROMOTERS and PROMOTION VIEWERS

4. **RELAYS**:
   - Standard Nostr relay servers propagating events between participants
   - Store and distribute protocol events according to Nostr standards
   - Connect all actors in the ecosystem without requiring direct coordination

These actors interact in a market-driven ecosystem where PROMOTERS seek visibility, PROMOTION VIEWERS monetize their attention, and BILLBOARD OPERATORS provide the infrastructure and verification services that make the system possible. The decentralized nature ensures that no single entity controls the promotional content marketplace.

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
- Specify personal asking prices in `sats_per_second`
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

## How does topic-based matching work between PROMOTERS and PROMOTION VIEWERS?

The PROMO PROTOCOL includes a bidirectional topic matching system that connects PROMOTERS and PROMOTION VIEWERS based on shared interests:

- **Topic Tags**: Both PROMOTERS and PROMOTION VIEWERS can specify content topics using standard Nostr `t` tags
- **PROMOTION VIEWER Topics**: In kind:17888 events, PROMOTION VIEWERS include topics they're interested in seeing
- **PROMOTER Topics**: In kind:18888 events, PROMOTERS specify topics relevant to their promoted content
- **Bidirectional Matching**: BILLBOARDs prioritize matches where PROMOTER and PROMOTION VIEWER topics overlap
- **Matching Algorithm**: BILLBOARDs first filter by economic criteria (bid ≥ ask), then prioritize by topic overlap
- **Topic Weighting**: Matches with more overlapping topics receive higher priority
- **Default Behavior**: BILLBOARDs can still match based purely on economics when no topic overlap exists

### Benefits:
- PROMOTION VIEWERS see more relevant content aligned with their interests
- PROMOTERS achieve higher engagement rates by reaching interested audiences
- The marketplace becomes more efficient with content relevance as a matching factor
- Quality-based incentives improve the overall ecosystem

### Example:
1. A PROMOTION VIEWER indicates interest in `["t", "bitcoin"]` and `["t", "lightning"]`
2. A PROMOTER tags their content with `["t", "bitcoin"]` and `["t", "nostr"]`
3. The BILLBOARD identifies "bitcoin" as a matching topic and prioritizes this match over others
4. The PROMOTION VIEWER receives relevant content about bitcoin
5. The PROMOTER achieves higher engagement by reaching an interested viewer

All topic matching is case-insensitive and BILLBOARDs may implement additional algorithms like semantic matching or topic hierarchies to further improve relevance.

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
- Operate through standard Nostr events (kind:28888)

This design encourages market-driven selection of effective BILLBOARD implementations and practices.

## How do PROMOTIONS begin and end?

### PROMOTION Lifecycle
- PROMOTIONS begin when PROMOTERS publish kind:18888 events
- PROMOTIONS remain active until:
  1. The PROMOTER publishes a kind:5 event deleting the PROMOTION
  2. The BILLBOARD terminates the PROMOTION based on its criteria
- BILLBOARDs must monitor for and respect deletion events

## How are PROMOTION views verified?

The PROMO PROTOCOL includes a transparent verification system for promotional content views through BILLBOARD PROMOTION CONFIRMATION events:

- **Confirmation Events**: BILLBOARDs publish standard kind:28889 events when a PROMOTION VIEWER successfully completes viewing promoted content
- **Required Duration Verification**: BILLBOARDs verify that viewing time (completed_at - started_at) meets or exceeds the duration required in the original PROMOTION
- **Complete Verification Record**: Each confirmation includes the PROMOTION event ID, PROMOTER pubkey, PROMOTION VIEWER pubkey, and precise timestamps
- **Transparent Audit Trail**: All marketplace participants can verify completed views through these immutable confirmation events
- **Real-Time Publication**: BILLBOARDs publish confirmations promptly after successful view completion

### Verification Process
1. PROMOTION VIEWER engages with a PROMOTION on a BILLBOARD
2. BILLBOARD precisely tracks viewing start timestamp (started_at)
3. BILLBOARD continues tracking until viewing requirements are met
4. BILLBOARD records completion timestamp (completed_at)
5. BILLBOARD verifies that (completed_at - started_at) ≥ required duration
6. Upon verification, BILLBOARD publishes a kind:28889 BILLBOARD PROMOTION CONFIRMATION event
7. This confirmation links the original PROMOTION, both participants' pubkeys, and exact timestamps
8. PROMOTERS can independently verify that their content was viewed for the required duration
9. All participants retain access to the immutable verification record

BILLBOARDs will only publish confirmation events for genuinely completed views with accurate timestamps, ensuring the integrity of the verification system. These confirmation events also serve as the primary data source for the metrics and analytics described in the protocol, enabling accurate reporting and establishing trust between all participants.

## How do PROMOTERS access and interpret their campaign analytics?

PROMOTERS in the PROMO PROTOCOL have two primary options for accessing and interpreting campaign analytics:

1. **Custom Implementation**: PROMOTERS can develop their own data analysis systems by:
   - Subscribing to kind:38891 events (BILLBOARD METRICS) related to their PROMOTIONS
   - Collecting kind:28889 events (PROMOTION CONFIRMATIONS) for verification records
   - Building custom dashboards and analysis tools for their specific needs
   - Implementing their own performance metrics and reporting systems

2. **Service Providers**: PROMOTERS can pay specialized service providers who:
   - Aggregate and analyze campaign data across multiple BILLBOARDs
   - Provide user-friendly dashboards and reporting interfaces
   - Offer advanced analytics and insights beyond basic metrics
   - Handle the technical aspects of data collection and processing

The standardized kind:38891 BILLBOARD METRICS events include key performance indicators such as:
- Total impressions and complete views
- Completion rates and average view durations
- Cost per impression and cost per engagement
- Total campaign spending

These metrics enable PROMOTERS to evaluate campaign performance, optimize their strategies, and maximize their return on investment, regardless of whether they choose custom implementation or service providers for analysis.

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

The protocol supports robust content filtering options for PROMOTION VIEWERS:

### Block List Capabilities
- PROMOTION VIEWERS can maintain personal block lists for unwanted PROMOTIONS
- PROMOTION VIEWERS can block specific PROMOTION event IDs using NIP-51 lists
- PROMOTION VIEWERS can block all PROMOTIONS from specific PROMOTERS
- PROMOTION VIEWERS can specify which content types (kinds) they're willing to view

### Implementation
- Block lists are maintained as addressable NIP-51 lists (kind:30003)
- Preferences are expressed in kind:17888 PROMOTION VIEWER events
- BILLBOARDs must respect all PROMOTION VIEWER preferences when matching PROMOTIONS
- All preferences update in real-time when PROMOTION VIEWERS publish changes

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
- [NIP-X6](./NIP-X6.md): BILLBOARD PROMOTION CONFIRMATION
- NIP-XX: BILLBOARD STATISTICS (coming soon)
- NIP-XX: LIGHTNING PAYMENTS (coming soon)
- NIP-XX: ECASH PAYMENTS (coming soon)