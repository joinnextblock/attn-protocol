# Multi-stage build for @attn-protocol/node
# Build context should be attn-protocol root

# Build stage - Use Node.js v20 LTS for vitest/tinypool compatibility
# See CODE_REVIEW_REPORT.md for details on Node.js v22 tinypool issue
FROM node:20-alpine3.19 AS builder

# Keep base image patched
RUN apk upgrade --no-cache

WORKDIR /app

# Install ZeroMQ system libraries and build dependencies
RUN apk add --no-cache \
    zeromq-dev \
    python3 \
    make \
    g++ \
    git

# Copy root package.json for workspace setup
COPY package.json package-lock.json ./

# Copy core package (required by SDK)
COPY packages/core/package.json ./packages/core/
COPY packages/core/src ./packages/core/src
COPY packages/core/tsconfig.json ./packages/core/

# Copy SDK package (required by node)
COPY packages/sdk/package.json ./packages/sdk/
COPY packages/sdk/src ./packages/sdk/src
COPY packages/sdk/tsconfig.json ./packages/sdk/

# Copy node package
COPY packages/node/package.json ./packages/node/

# Install all workspace dependencies (including dev for TypeScript build)
RUN npm ci

# Build core package (required for SDK)
WORKDIR /app/packages/core
RUN npm run build

# Build SDK package (required for node)
WORKDIR /app/packages/sdk
RUN npm run build

# Copy node source code and prune dev dependencies
WORKDIR /app/packages/node
COPY packages/node .

# Prune dev dependencies for production
WORKDIR /app
RUN npm prune --omit=dev

# Production stage - Use Node.js v20 LTS for consistency
FROM node:20-alpine3.19

# Keep runtime image patched
RUN apk upgrade --no-cache

WORKDIR /app

# Install ZeroMQ runtime libraries (no dev dependencies)
RUN apk add --no-cache \
    zeromq \
    ca-certificates

# Copy application from builder with correct ownership
COPY --from=builder --chown=node:node /app /app

# Switch to node package directory
WORKDIR /app/packages/node

# Switch to non-root user
USER node

# Set environment variables
ENV NODE_ENV=production

# Health check ensures the node process is alive
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD pgrep -f "node.*src/index.js" >/dev/null || exit 1

# Run the node service
CMD ["node", "src/index.js"]
