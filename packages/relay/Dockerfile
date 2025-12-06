FROM golang:1.24-alpine AS builder

WORKDIR /app

# Install build dependencies for SQLite
RUN apk add --no-cache gcc musl-dev

# Copy go mod files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Build the application (CGO_ENABLED=1 for SQLite)
RUN CGO_ENABLED=1 GOOS=linux go build -o relay ./cmd/relay

# Final stage
FROM alpine:latest

# Install ca-certificates for HTTPS requests, wget for healthchecks, and SQLite runtime
RUN apk --no-cache add ca-certificates wget sqlite

WORKDIR /root/

# Create data directory for SQLite database
RUN mkdir -p /data

# Copy the binary from builder stage
COPY --from=builder /app/relay .

# Expose port
EXPOSE 8010

# Run the application
CMD ["./relay"]

