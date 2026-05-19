# Production Dockerfile
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json

RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Copy cached deps — root hoisted + workspace node_modules (has .bin/next)
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/package-lock.json ./package-lock.json
COPY --from=deps /app/apps/web/package.json ./apps/web/package.json
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules

COPY apps/web apps/web
COPY services/prisma services/prisma

# Generate Prisma client (absolute path from root /app)
RUN /app/node_modules/.bin/prisma generate --schema=services/prisma/schema.prisma

# Build Next.js from apps/web directory (binary at apps/web/node_modules/.bin)
WORKDIR /app/apps/web
RUN node node_modules/.bin/next build

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built Next.js output
COPY --from=builder /app/apps/web/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/node_modules ./node_modules

# Copy Prisma schema for db push
COPY --from=builder /app/services/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Start script: push Prisma schema then run Next.js
RUN printf '#!/bin/sh\nset -e\nnpx --yes prisma db push --schema=./prisma/schema.prisma --accept-data-loss 2>&1\necho "Schema pushed OK"\nexec node node_modules/.bin/next start\n' > /app/start.sh && chmod +x /app/start.sh

USER nextjs
EXPOSE 3001
ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

CMD ["/app/start.sh"]
