# Build stage
FROM golang:1.24-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache git

# Copy go.mod files for all packages (for replace directives)
COPY packages/go-core/go.mod packages/go-core/go.mod
COPY packages/go-framework/go.mod packages/go-framework/go.mod
COPY packages/go-framework/go.sum packages/go-framework/go.sum
COPY packages/go-marketplace/go.mod packages/go-marketplace/go.mod
COPY packages/go-marketplace/go.sum packages/go-marketplace/go.sum

# Copy source code
COPY packages/go-core/ packages/go-core/
COPY packages/go-framework/ packages/go-framework/
COPY packages/go-marketplace/ packages/go-marketplace/

# Build the marketplace service
WORKDIR /app/packages/go-marketplace
RUN go mod download
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /marketplace ./cmd/marketplace

# Runtime stage
FROM alpine:3.19

RUN apk add --no-cache ca-certificates

WORKDIR /app

COPY --from=builder /marketplace /app/marketplace

# Create non-root user
RUN adduser -D -u 1000 marketplace
USER marketplace

EXPOSE 8787

CMD ["/app/marketplace"]
