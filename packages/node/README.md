# @attn-protocol/node

Bitcoin ZeroMQ to Nostr bridge that streams Bitcoin blocks as ATTN-01 events to configured relays.

## Features

- Connects to Bitcoin Core via ZeroMQ for real-time block notifications
- Publishes ATTN-01 block events to Nostr relays
- Supports both authenticated (NIP-42) and non-authenticated relays
- Automatic reconnection with exponential backoff
- Tracks relay classification (auth vs noauth)

## Installation

```bash
npm install @attn-protocol/node
```

## Configuration

Copy `env.example` to `.env` and configure:

```bash
# Bitcoin Node ZeroMQ Configuration
NODE_SERVICE_BITCOIN_ZMQ_HOST=localhost
NODE_SERVICE_BITCOIN_ZMQ_PORT=29000
NODE_SERVICE_BITCOIN_ZMQ_TOPIC=hashblock

# Bitcoin Node RPC Configuration
NODE_SERVICE_BITCOIN_RPC_HOST=localhost
NODE_SERVICE_BITCOIN_RPC_PORT=8332
NODE_SERVICE_BITCOIN_RPC_USER=bitcoin
NODE_SERVICE_BITCOIN_RPC_PASSWORD=password
NODE_SERVICE_BITCOIN_RPC_PROTOCOL=http

# Nostr Configuration
NODE_SERVICE_NOSTR_PRIVATE_KEY=nsec...

# Relay URLs by authentication type (comma-separated)
# AUTH relays require NIP-42 authentication
NODE_SERVICE_NOSTR_RELAY_URLS_AUTH=wss://relay.nextblock.city
# NOAUTH relays do not require authentication
NODE_SERVICE_NOSTR_RELAY_URLS_NOAUTH=wss://relay.damus.io,wss://nos.lol
```

## Usage

### As a standalone service

```bash
npm start
```

### Programmatic usage

```javascript
import { ZeroMQToNostrBridge } from '@attn-protocol/node';

const bridge = new ZeroMQToNostrBridge({
  relay_config: {
    auth_relay_urls: ['wss://relay.nextblock.city'],
    noauth_relay_urls: ['wss://relay.damus.io']
  },
  private_key: 'nsec...'
});

await bridge.start();

// Get relay classification
const classification = bridge.get_relay_classification();
// { 'wss://relay.nextblock.city': 'auth', 'wss://relay.damus.io': 'noauth' }

// Get health stats
const stats = bridge.get_health_stats();
```

## Relay Classification

The node service distinguishes between two types of relays:

- **AUTH relays**: Relays that require NIP-42 authentication. Configure with `NODE_SERVICE_NOSTR_RELAY_URLS_AUTH`.
- **NOAUTH relays**: Public relays that don't require authentication. Configure with `NODE_SERVICE_NOSTR_RELAY_URLS_NOAUTH`.

You can query relay classification at runtime:

```javascript
// Get all relay classifications
const classification = bridge.get_relay_classification();

// Check if a specific relay requires auth
const isAuth = bridge.nostr.is_auth_relay('wss://relay.nextblock.city');

// Get connected relays by type
const authRelays = bridge.nostr.get_connected_auth_relays();
const noauthRelays = bridge.nostr.get_connected_noauth_relays();
```

## License

MIT
