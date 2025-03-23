# THE ATTENTION MARKETPLACE

## Executive Summary
The Promoted Notes protocol establishes a decentralized framework for paid content promotion within the Nostr ecosystem. By defining standardized communication methods between buyers, sellers, and verifying nodes, the protocol creates new economic opportunities while preserving Nostr's core principles of decentralization, privacy, and user sovereignty.

## Key Features
- Decentralized pay-per-view content promotion system
- Satoshi-based payment infrastructure
- Content-based targeting through topic matching
- Transparent engagement metrics and verification
- Customizable user preferences and blacklists
- No centralized intermediaries or authorities

## Economic Architecture
- Market-driven pricing mechanism with no central rate setting
- Direct peer-to-peer economic relationship between content promoters and viewers
- Transparent billboard fee structure defined in kind:28888 events
- All monetary values denominated in satoshis for consistency
- Billboard operators match buyers and sellers only when bid ≥ ask
- Optional content relevance matching through topic preferences

## Trust Framework
- Decentralized trust model with no central authority
- Explicit pubkey-based billboard selection by both buyers and sellers
- Self-sovereign trust relationships maintained by individual participants
- Transparent verification through confirmation events
- Market incentives naturally align with honest operation
- Explicit match events providing transparency in the promotion lifecycle

## Billboard Operation
Billboard operators maintain full autonomy over implementation details. The protocol defines only the communication standards, while operators can:
- Implement custom matching algorithms and topic relevance scoring
- Select verification methods and anti-fraud measures
- Establish fee structures and economic parameters
- Determine event caching/storage policies
- Configure viewing duration requirements
- Generate anonymized metrics for promotion performance
- Create explicit match and confirmation events for transparency
- Specify supported event kinds through the `k` tag in configuration
- Specify supported event nips through the `nips` tag in configuration

### Billboard Event Kind Support
Billboard operators explicitly declare which event kinds they support in their kind:28888 configuration events. This allows:
- Specialization in specific content types (video-only, marketplace-only, etc.)
- Optimization for particular display and verification requirements
- Clear expectations for buyers about which content types a billboard can promote
- Market differentiation between billboard operators based on supported content
- Higher quality viewing experience through format-specific implementation

## Stakeholders

### Billboard Operators
- Serve as verification infrastructure between buyers and sellers
- Configure viewing duration requirements
- Set customizable service fees
- Match relevant content with interested viewers
- Validate successful promotional views
- Publish metrics, match, and confirmation events
- Operate through standard Nostr events (kind: 28888, 28889, 28890, 38891)
- Declare supported event kinds in configuration

### Sellers (Content Viewers)
- Set personal asking prices in `sats_per_second`
- Express content preferences through topic tags
- Create blacklists for unwanted content
- Earn by viewing promoted content
- Participate through simple Nostr events (kind: 17888)
- Maintain full control over which content to view
- Receive transparent confirmation of completed views

### Buyers (Content Promoters)
- Specify Nostr events to promote
- Set custom bid amounts in `sats_per_second`
- Define required viewing durations for content
- Categorize promotions with relevant topic tags
- Choose trusted billboard nodes for verification
- Submit promotion requests through Nostr events (kind: 18888)
- Access anonymized performance metrics

## Ideal Event Kinds for Promotion

1. **Kind 22: Short-form Portrait Video Event**
   - Perfect alignment with limited viewing duration requirements
   - Highest engagement format in current social media landscape
   - Complete content consumption possible within promotion window
   - Mobile-optimized vertical format for convenient viewing
   - Visual format creates immediate impact
   - Natural fit for the attention-based promotion economy

2. **Kind 1: Short Text Note**
   - Core Nostr content format with universal client support
   - Quick to consume within short timeframes
   - Wide audience appeal across various interests
   - Simple engagement options (reactions, zaps, replies)

3. **Kind 20: Picture**
   - Visual content with high immediate impact
   - Quick consumption suitable for brief viewing periods
   - Strong conversion potential for artistic/visual content
   - Popular across diverse user segments

4. **Kind 21: Video Event**
   - Rich media content with strong engagement potential
   - Supports longer-form video content than kind 22
   - Higher production value content opportunities
   - Suitable for more detailed storytelling

5. **Kind 30023: Long-form Content**
   - Premium content with higher promotional value
   - Teaser/preview model drives further engagement
   - Valuable for content creators building audiences
   - Higher conversion potential for engaged readers

6. **Kind 30018: Marketplace Product**
   - Direct commercial intent with clear ROI
   - Natural alignment between promotion and sales
   - Targeted interest matching through topics
   - Clear conversion metrics (purchases)

7. **Kind 31922/31923: Calendar Events**
   - Time-sensitive content with natural urgency
   - Clear call to action (event attendance)
   - Targeted local/interest-based matching potential
   - Measurable conversion metrics (RSVPs)

8. **Kind 34550: Community Definition**
   - Community building and membership growth
   - Collective funding potential for promotion
   - Interest-based matching with potential members
   - Clear benefit metrics (new memberships)

9. **Kind 1068: Poll**
   - Interactive content with high engagement
   - Clear participation metrics (votes)
   - Interest-based targeting potential
   - Time-sensitive promotion value

## Protocol Implementation

The protocol is defined through a series of NIPs (Nostr Implementation Possibilities):

### Core Protocol
- [NIP-X1](./NIP-X1-basic-protocol.md): BASIC PROTOCOL - Defines the foundational event types and interactions

### Enhancement NIPs
- [NIP-X2](./NIP-X2-billboard-metrics.md): BILLBOARD METRICS - Standardized metrics reporting for promotion performance
- [NIP-X3](./NIP-X3-seller-blacklist.md): SELLER BLACKLIST - Enables sellers to specify content they don't want to view
- [NIP-X4](./NIP-X4-seller-topics.md): SELLER TOPICS - Allows sellers to express content interests with topic tags
- [NIP-X5](./NIP-X5-buyer-topics.md): BUYER TOPICS - Enables buyers to categorize promotions with topic tags
- [NIP-X6](./NIP-X6-billboard-confirmation.md): BILLBOARD CONFIRMATION - Verification events for completed promotional views
- [NIP-X7](./NIP-X7-billboard-match-event.md): BILLBOARD MATCH EVENT - Explicit records of buyer-seller matches

### Upcoming NIPs (Planned)
- NIP-XX: BILLBOARD STATISTICS - Aggregated statistics for billboard operation
- NIP-XX: LIGHTNING PAYMENTS - Integration with Lightning Network for payments
- NIP-XX: ECASH PAYMENTS - Integration with ecash systems for payments

## Protocol Compatibility

This protocol fully aligns with Nostr's design principles and maintains compatibility with existing NIPs, particularly:
- Standard Nostr event and tag conventions
- NIP-40 Expiration Timestamp
- NIP-51 Lists (for complementary interest sets)
- NIP-57 Lightning Zaps (for payment infrastructure)
- NIP-15 Nostr Marketplace (for aligned economic structures)

Implementations of any optional NIP remain backward compatible with the core protocol.