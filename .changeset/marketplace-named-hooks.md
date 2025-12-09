---
"@attn-protocol/marketplace": minor
---

feat(marketplace): Add named hook methods and flatten config

**Breaking Changes (0.x.x):**
- Changed from string-based hooks (`marketplace.on('hook_name', ...)`) to named methods (`marketplace.on_hook_name(...)`)
- Flattened `marketplace_params` into root config (e.g., `name`, `description`, `min_duration` are now top-level)

**New Features:**
- Added 26 named hook methods with full TypeScript types
- Added `HookHandle` interface with `unregister()` for removing handlers
- Added profile publishing support (`profile`, `follows`, `publish_profile_on_connect` config options)
- Access framework hooks via `marketplace.attn.on_profile_published()`, etc.

**Config Changes:**
- `relay_config` now has 4 arrays: `read_auth`, `read_noauth`, `write_auth`, `write_noauth`
- Marketplace params (`name`, `description`, `min_duration`, `max_duration`, etc.) moved to root config
