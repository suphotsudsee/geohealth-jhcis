# Stage 1: Install all dependencies (npm workspaces monorepo)
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json

RUN npm ci

# Stage 2: Build Next.js
FROM node:20-alpine AS builder
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Copy root deps (hoisted packages)
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/package-lock.json ./package-lock.json
COPY --from=deps /app/apps/web/package.json ./apps/web/package.json

# Copy source code (no node_modules — .gitignore handles that)
COPY apps/web apps/web
COPY services/prisma services/prisma

# Copy workspace node_modules from deps (has .bin/next symlink)
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules

# Generate Prisma client
RUN ./node_modules/.bin/prisma generate --schema=services/prisma/schema.prisma

# Build Next.js from apps/web directory
WORKDIR /app/apps/web
RUN npx next build

# Stage 3: Minimal production runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/web/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static .next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
