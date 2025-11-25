# attn-framework Lifecycle Hooks

## Ordered Lifecycle Sequence

The attn-framework follows a deterministic lifecycle sequence. Hooks fire in this order:

```mermaid
graph TD
    Start([Start]) --> relay_connect[1. on_relay_connect<br/>Connect to Nostr relay]
    relay_connect -->     receive_events[2. Receive Events<br/>on_new_promotion<br/>on_new_attention<br/>on_new_match]
    receive_events --> match[3. on_match_published<br/>Publish MATCH event]
    match --> confirmations[4. Receive Confirmations<br/>on_billboard_confirm<br/>on_viewer_confirm]
    confirmations --> final[5. on_marketplace_confirmed<br/>Publish final MARKETPLACE_CONFIRMATION]

    subgraph Block Synchronization
        block_finalized[on_new_block<br/>New Bitcoin block detected]
        block_gap[on_block_gap_detected<br/>Gap between expected/actual height]
    end

    subgraph Error Handling
        relay_disconnect[on_relay_disconnect]
        rate_limit[on_rate_limit]
        health_change[on_health_change]
    end

    relay_connect -.->|error| relay_disconnect
    receive_events -.->|error| rate_limit
    block_finalized --> receive_events
    block_gap --> health_change
    relay_disconnect --> health_change
    rate_limit --> health_change
```

## Lifecycle Stages

### 1. Infrastructure Connection
- **on_relay_connect**: Nostr relay connected (event source/sink)

### 2. Event Reception
- **on_new_promotion**: PROMOTION event received (kind 38288)
- **on_new_attention**: ATTENTION event received (kind 38388)
- **on_new_match**: MATCH event received (kind 38888)
- **on_new_block**: New Bitcoin block detected (triggers event processing)

### 3. Matching & Publication
- **on_match_published**: MATCH event published (kind 38888) - backward compatibility hook with promotion/attention IDs

### 4. Confirmation Reception
- **on_billboard_confirm**: Billboard confirmation received (kind 38488)
- **on_viewer_confirm**: Viewer confirmation received (kind 38588)

### 5. Final Settlement
- **on_marketplace_confirmed**: Final MARKETPLACE_CONFIRMATION published (kind 38688)

## Error & Health Hooks

These hooks can interrupt the normal flow at any stage:

- **on_relay_disconnect**: Nostr relay disconnected
- **on_rate_limit**: Rate limit encountered
- **on_block_gap_detected**: Block height gap detected
- **on_health_change**: Health status changed

## Hook Execution Order

Hooks execute in registration order. Implementations register handlers that decide what to do when each hook fires. The framework provides the infrastructure; implementations provide the logic.

