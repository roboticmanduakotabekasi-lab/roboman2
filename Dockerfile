# ==============================================================================
# DOCKERFILE - ROBOMAN2 (Robotics Club Management System - Self-Hosting)
# Node.js 22+ Native ESM & TypeScript Full-Stack Server
# ==============================================================================

# Stage 1: Build Frontend Assets
FROM node:22-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json ./
RUN npm ci

# Copy project files and build Vite production bundle
COPY . .
RUN npm run build

# Stage 2: Production Container
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Install only production runtime dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled frontend from builder
COPY --from=builder /app/dist ./dist

# Copy backend server and API handlers
COPY server.ts ./
COPY api/ ./api/
COPY src/ ./src/

# Create persistent storage directory for self-hosted data
RUN mkdir -p /app/data && chown -R node:node /app

USER node

EXPOSE 3000

# Start server in production mode
CMD ["npm", "start"]
