FROM node:20-alpine AS deps
WORKDIR /app

# Copy root package files (monorepo workspaces declaration)
COPY package.json package-lock.json ./

# Copy workspace package.json files so npm ci can resolve workspaces
COPY apps/web/package.json apps/web/package.json
COPY services/sync-worker/package.json services/sync-worker/package.json

RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app

# Copy node_modules and config from deps
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/package-lock.json ./package-lock.json

# Copy source — only what apps/web and prisma schema need
COPY apps/web apps/web
COPY services/prisma services/prisma

# Generate Prisma client
RUN npx prisma generate --schema=services/prisma/schema.prisma

# Build Next.js app (uses output: standalone)
RUN cd apps/web && npx next build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone output from apps/web
COPY --from=builder /app/apps/web/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static .next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
