# Debug Dockerfile — shows full build output
FROM node:20-alpine
WORKDIR /app

COPY . .

RUN echo "=== Checking file structure ===" && \
    ls -la && \
    echo "--- apps/web ---" && \
    ls -la apps/web/ && \
    echo "--- services/prisma ---" && \
    ls -la services/prisma/

RUN echo "=== Installing deps ===" && \
    npm ci 2>&1

RUN echo "=== Generating Prisma ===" && \
    npx prisma generate --schema=services/prisma/schema.prisma 2>&1

RUN echo "=== Checking next binary ===" && \
    ls -la apps/web/node_modules/.bin/next && \
    which next || echo "next not in PATH" && \
    ls -la node_modules/.bin/next 2>/dev/null || echo "next not in root node_modules"

RUN echo "=== Building Next.js ===" && \
    cd apps/web && \
    node node_modules/.bin/next build 2>&1; \
    echo "EXIT_CODE=$?"

WORKDIR /app/apps/web
ENV PORT=3001
ENV HOSTNAME="0.0.0.0"
CMD ["node", "node_modules/.bin/next", "start"]
