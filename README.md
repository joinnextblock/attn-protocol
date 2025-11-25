# ATTN Protocol

This monorepo contains all packages related to the ATTN (Attention) Protocol for NextBlock's decentralized attention marketplace.

## Packages

- **[@attn-protocol/protocol](./packages/protocol/)** - Protocol specification and documentation
- **[@attn-protocol/framework](./packages/framework/)** - Hook-based framework for building Bitcoin-native attention marketplace implementations
- **[@attn-protocol/sdk](./packages/sdk/)** - TypeScript SDK for creating and publishing ATTN Protocol events

## Quick Start

```bash
# Install all dependencies
npm install

# Build all packages
npm run build

# Run tests
npm test

# Format code
npm run format
```

## Development

Each package can be developed independently within the monorepo. Workspace dependencies are automatically linked.

### Protocol Specification
See [packages/protocol/](./packages/protocol/) for the complete protocol specification and documentation.

### Framework
The framework provides a hook-based system for building attention marketplace implementations. See [packages/framework/](./packages/framework/) for details.

### SDK
The SDK provides type-safe event creation and publishing. See [packages/sdk/](./packages/sdk/) for usage examples.

## Contributing

Contributions are welcome! Please see individual package READMEs for specific contribution guidelines.

## License

MIT License

## Related Projects

- [Nostr Protocol](https://github.com/nostr-protocol/nips)
- [NextBlock City](https://github.com/joinnextblock)
