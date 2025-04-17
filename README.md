# PROMO Protocol
A decentralized framework enabling paid content promotion within the Nostr ecosystem. By establishing standardized communication methods for promotional content, the protocol creates new economic opportunities while preserving Nostr's core principles of decentralization and privacy.

## Packages
This monorepo contains the following packages:

### [`@promo-protocol/server`](./packages/promo-server)
A poc of a service that controls the refresh rate of a billboard

### [`@promo-protocol/dvmcp`](./packages/promo-dvmcp)
A poc of a DVMCP server as the compute layer for promo protocol services

### [`@promo-protocol/match-maker`](./packages/promo-match-maker)
A poc of a service that matches attention to promotions

### [`@promo-protocol/extension`](./packages/promo-extension)
A poc of a browser extension that notifies you when you can get paid to watch an ad

### [`@promo-protocol/indexer`](./packages/promo-indexer)
A PoC for listing all billboards that have been announced to a set of relays

### [`@promo-protocol/marketplace`](./packages/promo-marketplace)
A poc of an attention marketplace

### [`@promo-protocol/commons`](./packages/promo-commons)
Common package for common functions and constants

# Documentation
- [PROMO Protocl Specification](./docs/)

- [Server Package](./packages/promo-server/README.md)
- [DVMCP Package](./packages/promo-dvmcp/README.md)
- [Match Maker Package](./packages/promo-match-maker/README.md)
- [Verifier Package](./packages/promo-verifier/README.md)
- [Indexer Package](./packages/promo-indexer/README.md)
- [Marketplace Package](./packages/promo-marketplace/README.md)
- [Extention Package](./packages/promo-extension/README.md)
- [Widget Package](./packages/promo-widget/README.md)
- [Commons Package](./packages/promo-commons/README.md)

# Contributing
Contributions are welcome! Please feel free to submit pull requests or create issues.

# License
MIT License

# Related Projects
- [Nostr Protocol](https://github.com/nostr-protocol/nips)
- [AppleSauce](https://github.com/hzrd149/applesauce)
- [DVMCP](https://github.com/gzuuus/dvmcp)
- [Model Context Protocol](https://modelcontextprotocol.io/introduction)
