---
title: The PROMO Protocol
---
# The PROMO Protocol
## A Decentralized Content Promotion Framework for Nostr
#soveng

---

# Slide 1: What is PROMO Protocol?
- Decentralized framework for paid content promotion in Nostr
- Pay-per-view content promotion system
- Satoshi-based payment infrastructure
- Market-driven pricing
- User-controlled content filtering

---

# Slide 2: Why Decentralized Advertising?
- Direct value exchange
- Privacy-preserving
- User control
- Transparent economics
- Permissionless innovation
- Self-sovereign identity
- Censorship resistant

---

# Slide 3: Key Actors
1. PROMOTION CREATOR
   - Create and fund PROMOTION events
   - Set `sats_per_second` and `duration`
   - Choose trusted BILLBOARDS
2. PROMOTION VIEWERS
   - Create ATTENTION events
   - Set `sats_per_seconds` and `max_duration`
   - Choose trusted BILLBOARDS
3. BILLBOARD OPERATORS
   - Create and announce BILLBOARDS
   - Publish BILLBOARD metrics
   - Match PROMOTERS with PROMOTION VIEWERS
   - Verify PROMOTION is viewed by PROMOTION VIEWERS
   - Coordinates payment between PROMOTERS and PROMOTION VIEWERS

---

# Slide 4: Basic Workflow
1. BILLBOARD OPERATOR `writes` BILLBOARD event to RELAY
2. PROMOTION CREATOR `writes` PROMOTION event to RELAY
3. PROMOTION VIEWER `writes` ATTENTION event to RELAY
4. BILLBOARD OPERATOR `writes` MATCH event to RELAY
5. PROMOTION VIEWER `views` event referenced in PROMOTION event from MATCH event on BILLBOARD
6. BILLBOARD OPERATOR `verifies` PROMOTION VIEWER viewed PROMOTION
7. BILLBOARD OPERATOR `writes` CONFIRMATION event to RELAY
8. BILLBOARD OPERATOR `coordinates` payment between PROMOTION CREATOR and PROMOTION VIEWER
9. BILLBOARD OPERATOR `writes` METRIC event to RELAY

---

# Slide 5: Technical Implementation
- Kind:38088 - BILLBOARD event
- Kind:38188 - Promotion event
- Kind:38888 - Attention event
- Kind:38388 - Match event
- Kind:38488 - Confirmation event
- Kind:38588 - Metric events

Supporting Events:
- Kind:30003 - Block lists
All cryptographically signed

---

# Slide 6: Economic Model
- Bidirectional price setting
- Pay-per-second model
- Market-driven pricing
- Service fees for BILLBOARDs
- Micropayments via Lightning

---

# Slide 7: Trust Mechanisms
- Cryptographic verification
- Transparent operations
- Reputation systems
- Economic incentives
- No central authority

---

# Slide 8: For PROMOTION CREATORS
- Set up Nostr identity
- Choose client
- Fund account
- Create promotions
- Set parameters
- Monitor performance

---

# Slide 9: For PROMOTION VIEWERS
- Set up Nostr identity
- Connect Lightning wallet
- Set preferences
- Define ask price
- View content
- Earn satoshis

---

# Slide 10: For BILLBOARDs
- Infrastructure requirements
- Matching algorithms
- Payment processing
- Verification systems
- Analytics platform

---

# Slide 11: Matching Process
- Economic compatibility
- Topic relevance
- Content preferences
- Explicit records
- Transparent audit trail

---

# Slide 12: Topic-Based Matching
- Bidirectional topic tags
- Preference alignment
- Priority matching
- Semantic matching
- Topic hierarchies

---

# Slide 13: Content Control
- Topic-based filtering
- Kind filtering
- Block lists
- Minimum bid thresholds
- Content rating filters

---

# Slide 14: Viewer Preferences
- Interest selection
- Block list management
- Economic parameters
- Time-based filters
- Language preferences

---

# Slide 15: Block List System
- Pubkey-based blocks
- Word-based blocks
- Domain blocks
- Category blocks
- Privacy considerations

---

# Slide 16: Promotion Lifecycle
Creation:
- Event publication
- Activation requirements
- Active status

Conclusion:
- Natural completion
- Manual termination
- Forced termination

---

# Slide 17: View Verification
- Time-based verification
- Engagement monitoring
- Client attestation
- Consensus verification

Privacy:
- Minimal data collection
- Transparent methods
- No persistent tracking

---

# Slide 18: Analytics
- Performance metrics
- Audience insights
- Economic analytics
- Comparative data
- Real-time monitoring

---

# Slide 19: Benefits
- Fair value exchange
- Enhanced privacy
- User autonomy
- Market efficiency
- Innovation potential

---

# Slide 20: Future Potential
- Ecosystem growth
- Protocol extensions
- Client innovation
- Market development
- Community adoption

---

# Slide 21: Get Started
- Documentation: NIPs X1-X7
- Join the ecosystem
- Build applications
- Participate in promotions
- Shape the future of advertising
