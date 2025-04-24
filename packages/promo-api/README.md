# promo-api

A PoC of a [DVMCP](https://github.com/gzuuus/dvmcp) server as an open compute layer for [The PROMO Protocol](../../)

## Configuration

Requires a `config.dvmcp.yml` file with the following structure:

```yaml
nostr:
  privateKey: string
  relayUrls: string[]
mcp:
  version: string
  name: string
  about: string
  clientName: string
  clientVersion: string
```

## Running

### Development

`bun run dev`

### Production

_coming soon_

## Functions

### [get-metrics-by-billboard-id](./src/get-metrics-by-billboard-id/)

Returns [metrics](./src/get-metrics-by-billboard-id/README.md#example-response) for a billboard

Parameters:

- `billboard_id` (string): The ID of the billboard to get metrics for

Returns metrics data for the specified billboard including:

- Attention metrics (count, duration, sats/second)
- Promotion metrics (count, duration, sats/second)
- Match metrics (count)

Example call:

```typescript
const tool: Tool = {
  name: 'get-metrics-by-billboard-id',
  description: 'Get metrics for a specific BILLBOARD',
  inputSchema: {
    type: 'object',
    properties: {
      billboard_id: { type: 'string' },
    },
  },
};

const metrics = await tool_executor.executeTool('get-metrics-by-billboard-id', tool, {
  billboard_id,
});
```

### Development Goals

[roadmap](./ROADMAP.md)
