---
"@attn-protocol/sdk": patch
---

Add required metrics fields (billboard_count, promotion_count, attention_count, match_count) to MARKETPLACE events to conform with ATTN-01 specification. Fields default to 0 if not provided, maintaining backward compatibility.
