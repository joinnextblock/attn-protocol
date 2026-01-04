# Generic ATTN Protocol Marketplace
# Build from monorepo root: docker build -f attn-protocol/packages/marketplace/Dockerfile .

# ═══════════════════════════════════════════════════════════════
# BUILD STAGE
# ═══════════════════════════════════════════════════════════════
FROM oven/bun:1 AS builder

WORKDIR /app

# Copy attn-protocol packages (local dependencies)
COPY attn-protocol/packages/core ./attn-protocol/packages/core
COPY attn-protocol/packages/framework ./attn-protocol/packages/framework
COPY attn-protocol/packages/sdk ./attn-protocol/packages/sdk
COPY attn-protocol/packages/marketplace ./attn-protocol/packages/marketplace

# Build core (required by all other packages)
WORKDIR /app/attn-protocol/packages/core
RUN bun install && bun run build

# Build framework
WORKDIR /app/attn-protocol/packages/framework
RUN bun install

# Build SDK
WORKDIR /app/attn-protocol/packages/sdk
RUN bun install && bun run build

# Install marketplace package deps
WORKDIR /app/attn-protocol/packages/marketplace
RUN bun install

# ═══════════════════════════════════════════════════════════════
# PRODUCTION STAGE
# ═══════════════════════════════════════════════════════════════
FROM oven/bun:1

WORKDIR /app

# Copy built packages from builder
COPY --from=builder /app/attn-protocol ./attn-protocol

USER bun
WORKDIR /app/attn-protocol/packages/marketplace

ENV NODE_ENV=production

# Health check - verify bun can run
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD bun -e "process.exit(0)" || exit 1

# Run the generic marketplace server
CMD ["bun", "run", "src/server.ts"]
