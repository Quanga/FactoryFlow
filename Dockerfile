# ─── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# native module deps (bcrypt needs python3/make/g++)
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build


# ─── Stage 2: Runtime ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# Copy pre-compiled node_modules (includes native modules + drizzle-kit + tsx)
COPY --from=builder /app/node_modules ./node_modules

# Production build output
COPY --from=builder /app/dist ./dist

# Files drizzle-kit needs at startup to push the schema
COPY shared ./shared
COPY migrations ./migrations
COPY drizzle.config.ts ./
COPY tsconfig.json ./

# Startup entrypoint
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

EXPOSE 5000

ENTRYPOINT ["./docker-entrypoint.sh"]
