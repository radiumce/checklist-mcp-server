# Multi-stage build for minimal image size
# Stage 1: Build stage
FROM node:20-slim AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Copy scripts directory (needed for postinstall script)
COPY scripts ./scripts

# Install ALL dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY src ./src

# Build TypeScript to JavaScript
RUN npm run build

# Stage 2: Production stage
FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Copy scripts directory (needed for postinstall script)
COPY scripts ./scripts

# Install only production dependencies
RUN npm ci --omit=dev && \
    npm cache clean --force

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Copy documentation files
COPY README.md CHANGELOG.md LICENSE ./

# Expose default port
EXPOSE 8585

# Set environment variables
ENV NODE_ENV=production \
    PORT=8585 \
    MAX_SESSIONS=100

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:${PORT}/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 1

# Run the HTTP server by default
CMD ["node", "dist/http-server.js"]
