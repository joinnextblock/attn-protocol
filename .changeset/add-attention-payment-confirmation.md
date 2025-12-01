---
"@attn-protocol/core": minor
"@attn-protocol/sdk": minor
"@attn-protocol/framework": minor
"@attn-protocol/protocol": minor
---

Add ATTENTION_PAYMENT_CONFIRMATION event (kind 38988)

Adds a new event that allows attention owners to independently attest they received payment after the marketplace publishes MARKETPLACE_CONFIRMATION. This completes the payment audit trail by providing cryptographic proof that payment was actually delivered.

- Added event kind 38988 constant to core
- Added ATTENTION_PAYMENT_CONFIRMATION event specification to ATTN-01
- Added event builder and types to SDK
- Added hook handler and registration to framework
- Updated all documentation to include new event
